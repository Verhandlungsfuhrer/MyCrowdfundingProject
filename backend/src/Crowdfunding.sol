// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfunding {
    string public projectName;
    string public description;
    uint public goal;
    uint public totalFunds;
    address public owner;

    struct Donation {
        address donor;
        uint amount;
    }

    Donation[] public donations;

    constructor(string memory _name, string memory _description, uint _goal) {
        projectName = _name;
        description = _description;
        goal = _goal;
        owner = msg.sender;
        totalFunds = 0;
    }

    function fund() public payable {
        require(msg.value > 0, "Donate more than 0");
        totalFunds += msg.value;
        donations.push(Donation({donor: msg.sender, amount: msg.value}));
    }

    function withdraw() public {
        require(msg.sender == owner, "Only owner can withdraw");
        require(totalFunds > 0, "No funds to withdraw");
        uint amount = totalFunds;
        totalFunds = 0;
        payable(owner).transfer(amount);
    }

    function refund() public {
        require(totalFunds < goal, "Goal reached, cannot refund");
        uint refundAmount = 0;

        for (uint i = 0; i < donations.length; i++) {
            if (donations[i].donor == msg.sender && donations[i].amount > 0) {
                refundAmount += donations[i].amount;
                donations[i].amount = 0;
            }
        }

        require(refundAmount > 0, "No funds to refund");
        payable(msg.sender).transfer(refundAmount);
        totalFunds -= refundAmount;
    }

    function donorCount() public view returns (uint) {
        return donations.length;
    }

    function donors(uint index) public view returns (address donor, uint amount) {
        Donation storage d = donations[index];
        return (d.donor, d.amount);
    }
}
