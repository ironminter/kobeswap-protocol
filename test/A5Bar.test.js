const { expectRevert } = require('@openzeppelin/test-helpers');
const A5Token = artifacts.require('A5Token');
const A5Bar = artifacts.require('A5Bar');

contract('A5Token', ([alice, bob, carol]) => {
    beforeEach(async () => {
        this.a5 = await A5Token.new({ from: alice });
        this.bar = await A5Bar.new(this.a5.address, { from: alice });
        this.a5.mint(alice, '100', { from: alice });
        this.a5.mint(bob, '100', { from: alice });
        this.a5.mint(carol, '100', { from: alice });
    });

    it('should not allow enter if not enough approve', async () => {
        await expectRevert(
            this.bar.enter('100', { from: alice }),
            'ERC20: transfer amount exceeds allowance',
        );
        await this.a5.approve(this.bar.address, '50', { from: alice });
        await expectRevert(
            this.bar.enter('100', { from: alice }),
            'ERC20: transfer amount exceeds allowance',
        );
        await this.a5.approve(this.bar.address, '100', { from: alice });
        await this.bar.enter('100', { from: alice });
        assert.equal((await this.bar.balanceOf(alice)).valueOf(), '100');
    });

    it('should not allow withraw more than what you have', async () => {
        await this.a5.approve(this.bar.address, '100', { from: alice });
        await this.bar.enter('100', { from: alice });
        await expectRevert(
            this.bar.leave('200', { from: alice }),
            'ERC20: burn amount exceeds balance',
        );
    });

    it('should work with more than one participant', async () => {
        await this.a5.approve(this.bar.address, '100', { from: alice });
        await this.a5.approve(this.bar.address, '100', { from: bob });
        // Alice enters and gets 20 shares. Bob enters and gets 10 shares.
        await this.bar.enter('20', { from: alice });
        await this.bar.enter('10', { from: bob });
        assert.equal((await this.bar.balanceOf(alice)).valueOf(), '20');
        assert.equal((await this.bar.balanceOf(bob)).valueOf(), '10');
        assert.equal((await this.a5.balanceOf(this.bar.address)).valueOf(), '30');
        // A5Bar get 20 more A5 Tokens from an external source.
        await this.a5.transfer(this.bar.address, '20', { from: carol });
        // Alice deposits 10 more A5 Tokens. She should receive 10*30/50 = 6 shares.
        await this.bar.enter('10', { from: alice });
        assert.equal((await this.bar.balanceOf(alice)).valueOf(), '26');
        assert.equal((await this.bar.balanceOf(bob)).valueOf(), '10');
        // Bob withdraws 5 shares. He should receive 5*60/36 = 8 shares
        await this.bar.leave('5', { from: bob });
        assert.equal((await this.bar.balanceOf(alice)).valueOf(), '26');
        assert.equal((await this.bar.balanceOf(bob)).valueOf(), '5');
        assert.equal((await this.a5.balanceOf(this.bar.address)).valueOf(), '52');
        assert.equal((await this.a5.balanceOf(alice)).valueOf(), '70');
        assert.equal((await this.a5.balanceOf(bob)).valueOf(), '98');
    });
});
