// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfunding {
    string public projectName;
    string public description;
    uint256 public goal;
    uint256 public totalFunds;
    uint256 public deadline;
    address public owner;
    bool public isWithdrawn;
    
    struct Donation {
        address donor;
        uint256 amount;
        bool refunded;
    }
    
    Donation[] public donations;
    mapping(address => uint256) public donorToIndex;
    mapping(address => uint256) public donatedAmount;
    
    event Funded(address indexed donor, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);
    event Refunded(address indexed donor, uint256 amount);
    event DeadlineExtended(uint256 newDeadline);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier campaignActive() {
        require(block.timestamp < deadline, "Campaign has ended");
        require(!isWithdrawn, "Funds already withdrawn");
        _;
    }
    
    modifier campaignEnded() {
        require(block.timestamp >= deadline, "Campaign is still active");
        _;
    }

    constructor(
        string memory _name,
        string memory _description,
        uint256 _goal,
        uint256 _durationInDays
    ) {
        require(_goal > 0, "Goal must be greater than 0");
        require(_durationInDays > 0, "Duration must be greater than 0");
        
        projectName = _name;
        description = _description;
        goal = _goal;
        owner = msg.sender;
        deadline = block.timestamp + (_durationInDays * 1 days);
        isWithdrawn = false;
    }
    
    function fund() public payable campaignActive {
        require(msg.value > 0, "Donation must be greater than 0");
        
        require(totalFunds + msg.value >= totalFunds, "Overflow protection");
        
        totalFunds += msg.value;
        
        if (donatedAmount[msg.sender] == 0) {
            donations.push(Donation({
                donor: msg.sender,
                amount: msg.value,
                refunded: false
            }));
            donorToIndex[msg.sender] = donations.length - 1;
        } else {
            uint256 index = donorToIndex[msg.sender];
            donations[index].amount += msg.value;
        }
        
        donatedAmount[msg.sender] += msg.value;
        emit Funded(msg.sender, msg.value);
    }
    
    function withdraw() public onlyOwner campaignEnded {
        require(totalFunds >= goal, "Goal not reached");
        require(!isWithdrawn, "Funds already withdrawn");
        require(address(this).balance > 0, "No funds to withdraw");
        
        isWithdrawn = true;
        uint256 amount = address(this).balance;
        
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(owner, amount);
    }
    
    function refund() public campaignEnded {
        require(totalFunds < goal, "Goal reached, cannot refund");
        require(donatedAmount[msg.sender] > 0, "No donation to refund");
        
        uint256 index = donorToIndex[msg.sender];
        require(!donations[index].refunded, "Already refunded");
        
        uint256 refundAmount = donations[index].amount;
        require(refundAmount > 0, "No funds to refund");
        
        donations[index].refunded = true;
        donations[index].amount = 0;
        donatedAmount[msg.sender] = 0;
        totalFunds -= refundAmount;
        
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Transfer failed");
        
        emit Refunded(msg.sender, refundAmount);
    }
    
    function extendDeadline(uint256 _additionalDays) public onlyOwner campaignActive {
        require(_additionalDays > 0, "Additional days must be greater than 0");
        deadline += (_additionalDays * 1 days);
        emit DeadlineExtended(deadline);
    }
    
    function getCampaignStatus() public view returns (
        uint256 timeLeft,
        uint256 fundsRaised,
        uint256 fundingGoal,
        bool goalReached,
        bool campaignActiveStatus
    ) {
        timeLeft = block.timestamp < deadline ? deadline - block.timestamp : 0;
        fundsRaised = totalFunds;
        fundingGoal = goal;
        goalReached = totalFunds >= goal;
        campaignActiveStatus = block.timestamp < deadline && !isWithdrawn;
    }
    
    function getDonationsCount() public view returns (uint256) {
        return donations.length;
    }
    
    function getDonorInfo(address donor) public view returns (
        uint256 amount,
        bool refunded,
        uint256 donorIndex
    ) {
        if (donatedAmount[donor] == 0) {
            return (0, false, 0);
        }
        uint256 index = donorToIndex[donor];
        Donation memory d = donations[index];
        return (d.amount, d.refunded, index);
    }
    
    function emergencyWithdraw() public onlyOwner {
        require(block.timestamp >= deadline + 30 days, "Can only emergency withdraw 30 days after deadline");
        require(!isWithdrawn, "Funds already withdrawn");
        
        isWithdrawn = true;
        uint256 amount = address(this).balance;
        
        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(owner, amount);
    }
    
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    function cancelCampaign() public onlyOwner {
        require(totalFunds == 0, "Cannot cancel after funding started");
        selfdestruct(payable(owner));
    }
    
    receive() external payable {
        fund();
    }
}
