const { expectRevert, time } = require('@openzeppelin/test-helpers');
const A5Token = artifacts.require('A5Token');
const MasterChef = artifacts.require('MasterChef');
const MockERC20 = artifacts.require('MockERC20');

contract('MasterChef', ([alice, bob, carol, dev, minter]) => {
    beforeEach(async () => {
        this.a5 = await A5Token.new({ from: alice });
    });

    it('Verify state variables', async () => {
        this.chef = await MasterChef.new(this.a5.address, dev, '1000', '0', '1000', { from: alice });
        
        await this.a5.transferOwnership(this.chef.address, { from: alice });
        const a5 = await this.chef.a5();
        const devaddr = await this.chef.devaddr();
        const owner = await this.a5.owner();
        assert.equal(a5.valueOf(), this.a5.address);
        assert.equal(devaddr.valueOf(), dev);
        assert.equal(owner.valueOf(), this.chef.address);
    });

    it('Verify developer account permissions', async () => {
        this.chef = await MasterChef.new(this.a5.address, dev, '1000', '0', '1000', { from: alice });
        assert.equal((await this.chef.devaddr()).valueOf(), dev);
        await expectRevert(this.chef.dev(bob, { from: bob }), 'dev: wut?');
        await this.chef.dev(bob, { from: dev });
        assert.equal((await this.chef.devaddr()).valueOf(), bob);
        await this.chef.dev(alice, { from: bob });
        assert.equal((await this.chef.devaddr()).valueOf(), alice);
    })

    context('With ERC/LP token added to the field', () => {
        beforeEach(async () => {
            this.lp = await MockERC20.new('LPToken', 'LP', '10000000000', { from: minter });
            await this.lp.transfer(alice, '1000', { from: minter });
            await this.lp.transfer(bob, '1000', { from: minter });
            await this.lp.transfer(carol, '1000', { from: minter });
            this.lp2 = await MockERC20.new('LPToken2', 'LP2', '10000000000', { from: minter });
            await this.lp2.transfer(alice, '1000', { from: minter });
            await this.lp2.transfer(bob, '1000', { from: minter });
            await this.lp2.transfer(carol, '1000', { from: minter });
        });

        it('Verify emergency evacuation', async () => {
            this.chef = await MasterChef.new(this.a5.address, dev, '100', '100', '1000', { from: alice });
            await this.chef.add('100', this.lp.address, true);
            await this.lp.approve(this.chef.address, '1000', { from: bob });
            await this.chef.deposit(0, '100', { from: bob });
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '900');
            await this.chef.emergencyWithdraw(0, { from: bob });
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
        });

        it('Verify that you can receive A5 tokens after the farming time has passed', async () => {
            this.chef = await MasterChef.new(this.a5.address, dev, '100', '100', '1000', { from: alice });
            await this.a5.transferOwnership(this.chef.address, { from: alice });
            await this.chef.add('100', this.lp.address, true);
            await this.lp.approve(this.chef.address, '1000', { from: bob });
            await this.chef.deposit(0, '100', { from: bob });
            await time.advanceBlockTo('89');
            await this.chef.deposit(0, '0', { from: bob });                         
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '0');
            await time.advanceBlockTo('94');
            await this.chef.deposit(0, '0', { from: bob });                         
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '0');
            await time.advanceBlockTo('99');
            await this.chef.deposit(0, '0', { from: bob });                         
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '0');
            await time.advanceBlockTo('100');
            await this.chef.deposit(0, '0', { from: bob });                         
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '1000');
            await time.advanceBlockTo('104');
            await this.chef.deposit(0, '0', { from: bob });                         
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '5000');
            assert.equal((await this.a5.balanceOf(dev)).valueOf(), '500');
            assert.equal((await this.a5.totalSupply()).valueOf(), '5500');
        });

        it('Verify that if no one deposits, A5 tokens should not be distributed', async () => {
            this.chef = await MasterChef.new(this.a5.address, dev, '100', '200', '1000', { from: alice });
            await this.a5.transferOwnership(this.chef.address, { from: alice });
            await this.chef.add('100', this.lp.address, true);
            await this.lp.approve(this.chef.address, '1000', { from: bob });
            await time.advanceBlockTo('199');
            assert.equal((await this.a5.totalSupply()).valueOf(), '0');
            await time.advanceBlockTo('204');
            assert.equal((await this.a5.totalSupply()).valueOf(), '0');
            await time.advanceBlockTo('209');
            await this.chef.deposit(0, '10', { from: bob });                         
            assert.equal((await this.a5.totalSupply()).valueOf(), '0');
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '0');
            assert.equal((await this.a5.balanceOf(dev)).valueOf(), '0');
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '990');
            await time.advanceBlockTo('219');
            await this.chef.withdraw(0, '10', { from: bob });                         
            assert.equal((await this.a5.totalSupply()).valueOf(), '11000');
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '10000');
            assert.equal((await this.a5.balanceOf(dev)).valueOf(), '1000');
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
        });

        it('Verify that the correct A5 tokens are allocated to each mortgager.', async () => {
            this.chef = await MasterChef.new(this.a5.address, dev, '100', '300', '1000', { from: alice });
            await this.a5.transferOwnership(this.chef.address, { from: alice });
            await this.chef.add('100', this.lp.address, true);
            await this.lp.approve(this.chef.address, '1000', { from: alice });
            await this.lp.approve(this.chef.address, '1000', { from: bob });
            await this.lp.approve(this.chef.address, '1000', { from: carol });
            await time.advanceBlockTo('309');
            await this.chef.deposit(0, '10', { from: alice });
            await time.advanceBlockTo('313');
            await this.chef.deposit(0, '20', { from: bob });
            await time.advanceBlockTo('317');
            await this.chef.deposit(0, '30', { from: carol });
            await time.advanceBlockTo('319')
            await this.chef.deposit(0, '10', { from: alice });
            assert.equal((await this.a5.totalSupply()).valueOf(), '11000');
            assert.equal((await this.a5.balanceOf(alice)).valueOf(), '5666');
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '0');
            assert.equal((await this.a5.balanceOf(carol)).valueOf(), '0');
            assert.equal((await this.a5.balanceOf(this.chef.address)).valueOf(), '4334');
            assert.equal((await this.a5.balanceOf(dev)).valueOf(), '1000');
            await time.advanceBlockTo('329')
            await this.chef.withdraw(0, '5', { from: bob });
            assert.equal((await this.a5.totalSupply()).valueOf(), '22000');
            assert.equal((await this.a5.balanceOf(alice)).valueOf(), '5666');
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '6190');
            assert.equal((await this.a5.balanceOf(carol)).valueOf(), '0');
            assert.equal((await this.a5.balanceOf(this.chef.address)).valueOf(), '8144');
            assert.equal((await this.a5.balanceOf(dev)).valueOf(), '2000');
            await time.advanceBlockTo('339')
            await this.chef.withdraw(0, '20', { from: alice });
            await time.advanceBlockTo('349')
            await this.chef.withdraw(0, '15', { from: bob });
            await time.advanceBlockTo('359')
            await this.chef.withdraw(0, '30', { from: carol });
            assert.equal((await this.a5.totalSupply()).valueOf(), '55000');
            assert.equal((await this.a5.balanceOf(dev)).valueOf(), '5000');
            assert.equal((await this.a5.balanceOf(alice)).valueOf(), '11600');
            assert.equal((await this.a5.balanceOf(bob)).valueOf(), '11831');
            assert.equal((await this.a5.balanceOf(carol)).valueOf(), '26568');
            assert.equal((await this.lp.balanceOf(alice)).valueOf(), '1000');
            assert.equal((await this.lp.balanceOf(bob)).valueOf(), '1000');
            assert.equal((await this.lp.balanceOf(carol)).valueOf(), '1000');
        });

        it('Verify that the correct amount of A5 tokens are allocated to each pool.', async () => {
            this.chef = await MasterChef.new(this.a5.address, dev, '100', '400', '1000', { from: alice });
            await this.a5.transferOwnership(this.chef.address, { from: alice });
            await this.lp.approve(this.chef.address, '1000', { from: alice });
            await this.lp2.approve(this.chef.address, '1000', { from: bob });
            await this.chef.add('10', this.lp.address, true);
            await time.advanceBlockTo('409');
            await this.chef.deposit(0, '10', { from: alice });
            await time.advanceBlockTo('419');
            await this.chef.add('20', this.lp2.address, true);
            assert.equal((await this.chef.pendingA5(0, alice)).valueOf(), '10000');
            await time.advanceBlockTo('424');
            await this.chef.deposit(1, '5', { from: bob });
            assert.equal((await this.chef.pendingA5(0, alice)).valueOf(), '11666');
            await time.advanceBlockTo('430');
            assert.equal((await this.chef.pendingA5(0, alice)).valueOf(), '13333');
            assert.equal((await this.chef.pendingA5(1, bob)).valueOf(), '3333');
        });

        it('Verify that the reward of A5 tokens should be stopped after the reward period ends.', async () => {
            this.chef = await MasterChef.new(this.a5.address, dev, '100', '500', '600', { from: alice });
            await this.a5.transferOwnership(this.chef.address, { from: alice });
            await this.lp.approve(this.chef.address, '1000', { from: alice });
            await this.chef.add('1', this.lp.address, true);
            await time.advanceBlockTo('589');
            await this.chef.deposit(0, '10', { from: alice });
            await time.advanceBlockTo('605');
            assert.equal((await this.chef.pendingA5(0, alice)).valueOf(), '10500');
            await this.chef.deposit(0, '0', { from: alice });
            assert.equal((await this.chef.pendingA5(0, alice)).valueOf(), '0');
            assert.equal((await this.a5.balanceOf(alice)).valueOf(), '10600');
        });
    });
});
