// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract DeployCrowdfunding is Script {
    function run() external {
        vm.startBroadcast();
        
        new Crowdfunding(
            unicode"Мой первый краудфандинг",
            unicode"Это тестовый проект по сбору средств",
            0.1 ether // Цель: 0.1 ETH
        );
        
        vm.stopBroadcast();
    }
}