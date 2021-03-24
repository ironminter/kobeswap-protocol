const { expectRevert } = require('@openzeppelin/test-helpers');
const A5Token = artifacts.require('A5Token');

contract('A5Token', ([alice, bob, carol]) => {
    beforeEach(async () => {
        this.a5 = await A5Token.new({ from: alice });
    });

    it('should have correct name and symbol and decimal', async () => {
        const name = await this.a5.name();
        const symbol = await this.a5.symbol();
        const decimals = await this.a5.decimals();
        assert.equal(name.valueOf(), 'KobeSwap');
        assert.equal(symbol.valueOf(), 'A5');
        assert.equal(decimals.valueOf(), '18');
    });

    it('should only allow owner to mint token', async () => {
        await this.a5.mint(alice, '100', { from: alice });
        await this.a5.mint(bob, '1000', { from: alice });
        await expectRevert(
            this.a5.mint(carol, '1000', { from: bob }),
            'Ownable: caller is not the owner',
        );
        const totalSupply = await this.a5.totalSupply();
        const aliceBal = await this.a5.balanceOf(alice);
        const bobBal = await this.a5.balanceOf(bob);
        const carolBal = await this.a5.balanceOf(carol);
        assert.equal(totalSupply.valueOf(), '1100');
        assert.equal(aliceBal.valueOf(), '100');
        assert.equal(bobBal.valueOf(), '1000');
        assert.equal(carolBal.valueOf(), '0');
    });

    it('should supply token transfers properly', async () => {
        await this.a5.mint(alice, '100', { from: alice });
        await this.a5.mint(bob, '1000', { from: alice });
        await this.a5.transfer(carol, '10', { from: alice });
        await this.a5.transfer(carol, '100', { from: bob });
        const totalSupply = await this.a5.totalSupply();
        const aliceBal = await this.a5.balanceOf(alice);
        const bobBal = await this.a5.balanceOf(bob);
        const carolBal = await this.a5.balanceOf(carol);
        assert.equal(totalSupply.valueOf(), '1100');
        assert.equal(aliceBal.valueOf(), '90');
        assert.equal(bobBal.valueOf(), '900');
        assert.equal(carolBal.valueOf(), '110');
    });

    it('should fail if you try to do bad transfers', async () => {
        await this.a5.mint(alice, '100', { from: alice });
        await expectRevert(
            this.a5.transfer(carol, '110', { from: alice }),
            'ERC20: transfer amount exceeds balance',
        );
        await expectRevert(
            this.a5.transfer(carol, '1', { from: bob }),
            'ERC20: transfer amount exceeds balance',
        );
    });
  });
