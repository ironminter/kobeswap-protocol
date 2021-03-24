// SPDX-License-Identifier: MIT

pragma solidity =0.6.12;
pragma experimental ABIEncoderV2;


// File: uniswapv2/interfaces/IERC20.sol


interface IERC20Uniswap {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);

    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);
}

// File: contracts/libraries/Orders.sol



library Orders {
    bytes32 internal constant ORDER_TYPEHASH = keccak256(
        // solhint-disable-next-line
        "Order(address maker,address fromToken,address toToken,address amountIn,address amountOutMin,address recipient,address deadline)"
    );

    struct Order {
        address maker;
        address fromToken;
        address toToken;
        uint256 amountIn;
        uint256 amountOutMin;
        address recipient;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function hash(Order memory order) internal pure returns (bytes32) {
        return
            hash(
                order.maker,
                order.fromToken,
                order.toToken,
                order.amountIn,
                order.amountOutMin,
                order.recipient,
                order.deadline
            );
    }

    function hash(
        address maker,
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        uint256 deadline
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    ORDER_TYPEHASH,
                    maker,
                    fromToken,
                    toToken,
                    amountIn,
                    amountOutMin,
                    recipient,
                    deadline
                )
            );
    }
}

// File: contracts/libraries/Verifier.sol



library Verifier {
    function verify(
        address signer,
        bytes32 hash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (bool) {
        // It needs to have been signed by web3.eth_sign
        hash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        return signer == ecrecover(hash, v, r, s);
    }
}

// File: contracts/libraries/Bytes32Pagination.sol



library Bytes32Pagination {
    function paginate(
        bytes32[] memory hashes,
        uint256 page,
        uint256 limit
    ) internal pure returns (bytes32[] memory result) {
        result = new bytes32[](limit);
        for (uint256 i = 0; i < limit; i++) {
            if (page * limit + i >= hashes.length) {
                result[i] = bytes32(0);
            } else {
                result[i] = hashes[page * limit + i];
            }
        }
    }
}

// File: contracts/OrderBook.sol







contract OrderBook {
    using Orders for Orders.Order;
    using Bytes32Pagination for bytes32[];

    event OrderCreated(bytes32 indexed hash);

    // Array of hashes of all orders
    bytes32[] internal _allHashes;
    // Address of order maker => hashes (orders)
    mapping(address => bytes32[]) internal _hashesOfMaker;
    // Address of fromToken => hashes (orders)
    mapping(address => bytes32[]) internal _hashesOfFromToken;
    // Address of toToken => hashes (orders)
    mapping(address => bytes32[]) internal _hashesOfToToken;
    // Hash of an order => the order and its data
    mapping(bytes32 => Orders.Order) public orderOfHash;

    // Returns the number of orders of a maker
    function numberOfHashesOfMaker(address maker) public view returns (uint256) {
        return _hashesOfMaker[maker].length;
    }

    // Return the number of orders where fromToken is the origin token
    function numberOfHashesOfFromToken(address fromToken) public view returns (uint256) {
        return _hashesOfFromToken[fromToken].length;
    }

    // Return the number of orders where toToken is the target token
    function numberOfHashesOfToToken(address toToken) public view returns (uint256) {
        return _hashesOfToToken[toToken].length;
    }

    // Returns the number of all orders
    function numberOfAllHashes() public view returns (uint256) {
        return _allHashes.length;
    }

    // Returns an array of hashes of orders of a maker
    function hashesOfMaker(
        address maker,
        uint256 page,
        uint256 limit
    ) public view returns (bytes32[] memory) {
        return _hashesOfMaker[maker].paginate(page, limit);
    }
    
    // Returns an array of hashes of orders where fromToken is the origin token
    function hashesOfFromToken(
        address fromToken,
        uint256 page,
        uint256 limit
    ) public view returns (bytes32[] memory) {
        return _hashesOfFromToken[fromToken].paginate(page, limit);
    }

    // Returns an array of hashes of orders where toToken is the target token
    function hashesOfToToken(
        address toToken,
        uint256 page,
        uint256 limit
    ) public view returns (bytes32[] memory) {
        return _hashesOfToToken[toToken].paginate(page, limit);
    }

    // Return an array of all hashes
    function allHashes(uint256 page, uint256 limit) public view returns (bytes32[] memory) {
        return _allHashes.paginate(page, limit);
    }

    // Creates an order
    function createOrder(Orders.Order memory order) public {
        require(order.maker != address(0), "invalid-maker-address");
        require(order.fromToken != address(0), "invalid-from-token-address");
        require(order.toToken != address(0), "invalid-to-token-address");
        require(order.fromToken != order.toToken, "duplicate-token-addresses");
        require(order.amountIn > 0, "invalid-amount-in");
        require(order.amountOutMin > 0, "invalid-amount-out-min");
        require(order.recipient != address(0), "invalid-recipient");
        require(order.deadline > block.timestamp, "invalid-deadline");

        bytes32 hash = createOrderCallHash(
            order.maker,
            order.fromToken,
            order.toToken,
            order.amountIn,
            order.amountOutMin,
            order.recipient,
            order.deadline
        );
        require(
            Verifier.verify(order.maker, hash, order.v, order.r, order.s),
            "not-signed-by-maker"
        );

        require(orderOfHash[hash].maker == address(0), "order-exists");
        orderOfHash[hash] = order;

        _addHash(_allHashes, hash, order.deadline);
        _addHash(_hashesOfMaker[order.maker], hash, order.deadline);
        _addHash(_hashesOfFromToken[order.fromToken], hash, order.deadline);
        _addHash(_hashesOfToToken[order.toToken], hash, order.deadline);

        emit OrderCreated(hash);
    }

    function _addHash(
        bytes32[] storage hashes,
        bytes32 hash,
        uint256 deadline
    ) internal {
        // Hashes are ordered by deadline increasingly
        // If there are no hashes in the map yet
        if (hashes.length == 0) {
            hashes.push(hash);
            return;
        }
        uint256 index = uint256(-1);
        // Go through all hashes until you find an order with an earlier deadline
        for (uint256 i = 0; i < hashes.length; i++) {
            if (orderOfHash[hashes[i]].deadline > deadline) {
                index = i;
                break;
            }
        }
        // If it's the "longest" deadline, just put it at the end of the map
        if (index == uint256(-1)) {
            hashes.push(hash);
            return;
        }
        hashes.push();
        // Create an opening for the order where it belongs
        for (uint256 i = hashes.length - 1; i > index; i--) {
            hashes[i] = hashes[i - 1];
        }
        // Fit there order in the opening
        hashes[index] = hash;
    }

    // Returns the hash of the input arguments (which make an order)
    function createOrderCallHash(
        address maker,
        address fromToken,
        address toToken,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        uint256 deadline
    ) public pure returns (bytes32) {
        return Orders.hash(maker, fromToken, toToken, amountIn, amountOutMin, recipient, deadline);
    }
}