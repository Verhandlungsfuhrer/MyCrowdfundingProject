window.addEventListener('DOMContentLoaded', async () => {
    const contractAddress = "0x7675b4293a2d5d784a7d975dea1600342c9de4f8"; 
    const contractABI = [
        {
            "inputs": [
                {
                    "internalType": "string",
                    "name": "_name",
                    "type": "string"
                },
                {
                    "internalType": "string",
                    "name": "_description",
                    "type": "string"
                },
                {
                    "internalType": "uint256",
                    "name": "_goal",
                    "type": "uint256"
                }
            ],
            "stateMutability": "nonpayable",
            "type": "constructor"
        },
        {
            "inputs": [],
            "name": "description",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "donorCount",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "name": "donors",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "donor",
                    "type": "address"
                },
                {
                    "internalType": "uint256",
                    "name": "amount",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "fund",
            "outputs": [],
            "stateMutability": "payable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "goal",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [
                {
                    "internalType": "address",
                    "name": "",
                    "type": "address"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "projectName",
            "outputs": [
                {
                    "internalType": "string",
                    "name": "",
                    "type": "string"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "refund",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "totalFunds",
            "outputs": [
                {
                    "internalType": "uint256",
                    "name": "",
                    "type": "uint256"
                }
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "withdraw",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];

    // Получаем элементы DOM
    const connectBtn = document.getElementById('connectBtn');
    const fundBtn = document.getElementById('fundBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');
    const refundBtn = document.getElementById('refundBtn');
    const projectNameEl = document.getElementById('projectName');
    const descriptionEl = document.getElementById('description');
    const goalEl = document.getElementById('goal');
    const totalFundsEl = document.getElementById('totalFunds');
    const ownerEl = document.getElementById('owner');
    const amountInput = document.getElementById('amount');
    const progressFill = document.getElementById('progress');
    const donationsList = document.getElementById('donationsList');
    const contractAddressEl = document.getElementById('contractAddress');

    let provider, signer, contract, userAddress;

    // Инициализация при загрузке
    if (contractAddressEl) {
        contractAddressEl.textContent = contractAddress;
    }
    
    // Проверка наличия MetaMask
    if (!window.ethereum) {
        alert('Пожалуйста, установите MetaMask для использования этого приложения!');
        connectBtn.disabled = true;
        connectBtn.textContent = 'MetaMask не установлен';
        return;
    }

    // Функция подключения к MetaMask
    connectBtn.onclick = async () => {
        try {
            provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = await provider.getSigner();
            contract = new ethers.Contract(contractAddress, contractABI, signer);
            userAddress = await signer.getAddress();
            
            // Обновляем интерфейс
            connectBtn.textContent = `Подключен: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
            connectBtn.classList.add('connected');
            
            // Загружаем данные контракта
            await loadContractData();
            
        } catch (error) {
            console.error('Ошибка подключения:', error);
            alert(`Ошибка подключения: ${error.message}`);
        }
    };

    // Функция загрузки данных контракта
    async function loadContractData() {
        if (!contract) return;
        
        try {
            // Получаем основные данные
            const [name, desc, goal, total, owner] = await Promise.all([
                contract.projectName(),
                contract.description(),
                contract.goal(),
                contract.totalFunds(),
                contract.owner()
            ]);
            
            // Обновляем DOM
            projectNameEl.textContent = name;
            descriptionEl.textContent = desc;
            goalEl.textContent = ethers.formatEther(goal);
            totalFundsEl.textContent = ethers.formatEther(total);
            ownerEl.textContent = owner;
            
            // Обновляем прогресс-бар
            const goalNum = Number(ethers.formatEther(goal));
            const totalNum = Number(ethers.formatEther(total));
            const progressPercent = goalNum > 0 ? Math.min(100, (totalNum / goalNum) * 100) : 0;
            progressFill.style.width = `${progressPercent}%`;
            
            // Обновляем историю донатов
            await updateDonationsList();
            
            // Проверяем, является ли пользователь владельцем
            if (userAddress && userAddress.toLowerCase() === owner.toLowerCase()) {
                withdrawBtn.style.display = 'block';
            } else {
                withdrawBtn.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    // Функция обновления списка пожертвований
    async function updateDonationsList() {
        if (!contract) return;
        
        try {
            const donorCount = await contract.donorCount();
            donationsList.innerHTML = '';
            
            if (donorCount === 0) {
                const li = document.createElement('li');
                li.textContent = 'Пожертвований пока нет';
                donationsList.appendChild(li);
                return;
            }
            
            // Собираем все донаты
            const donationPromises = [];
            for (let i = 0; i < donorCount; i++) {
                donationPromises.push(contract.donors(i));
            }
            
            const donations = await Promise.all(donationPromises);
            
            // Фильтруем и отображаем только ненулевые донаты
            donations.forEach((donation, index) => {
                const [donor, amount] = donation;
                if (Number(amount) > 0) {
                    const li = document.createElement('li');
                    li.textContent = `${donor.slice(0, 6)}...${donor.slice(-4)}: ${ethers.formatEther(amount)} ETH`;
                    donationsList.appendChild(li);
                }
            });
            
        } catch (error) {
            console.error('Ошибка загрузки истории:', error);
        }
    }

    // Функция пожертвования
    fundBtn.onclick = async () => {
        if (!contract) {
            alert('Сначала подключите MetaMask!');
            return;
        }
        
        const ethAmount = amountInput.value;
        if (!ethAmount || Number(ethAmount) <= 0) {
            alert('Введите корректную сумму');
            return;
        }
        
        try {
            fundBtn.disabled = true;
            fundBtn.textContent = 'Подготовка...';
            
            const tx = await contract.fund({
                value: ethers.parseEther(ethAmount)
            });
            
            fundBtn.textContent = 'Ожидаем подтверждения...';
            await tx.wait();
            
            await loadContractData();
            amountInput.value = '0.001';
            alert('Транзакция успешна!');
            
        } catch (error) {
            console.error('Ошибка:', error);
            if (error.code === 'ACTION_REJECTED') {
                alert('Вы отклонили транзакцию');
            } else {
                alert('Ошибка: ' + (error.reason || error.message));
            }
        } finally {
            fundBtn.disabled = false;
            fundBtn.textContent = 'Отправить ETH';
        }
    };

    // Функция вывода средств (только владелец)
    withdrawBtn.onclick = async () => {
        if (!contract) {
            alert('Сначала подключите MetaMask!');
            return;
        }
        
        if (!confirm('Вы уверены, что хотите вывести все собранные средства?')) {
            return;
        }
        
        try {
            withdrawBtn.disabled = true;
            withdrawBtn.textContent = 'Вывод...';
            
            const tx = await contract.withdraw();
            await tx.wait();
            await loadContractData();
            
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = 'Вывести средства (только владелец)';
            
            alert('Средства успешно выведены!');
            
        } catch (error) {
            console.error('Ошибка вывода:', error);
            alert(`Ошибка: ${error.reason || error.message}`);
            
            withdrawBtn.disabled = false;
            withdrawBtn.textContent = 'Вывести средства (только владелец)';
        }
    };

    // Функция возврата средств
    refundBtn.onclick = async () => {
        if (!contract) {
            alert('Сначала подключите MetaMask!');
            return;
        }
        
        if (!confirm('Вы уверены, что хотите вернуть свои средства?')) {
            return;
        }
        
        try {
            refundBtn.disabled = true;
            refundBtn.textContent = 'Возврат...';
            
            const tx = await contract.refund();
            await tx.wait();
            await loadContractData();
            
            refundBtn.disabled = false;
            refundBtn.textContent = 'Вернуть средства (если цель не достигнута)';
            
            alert('Средства успешно возвращены!');
            
        } catch (error) {
            console.error('Ошибка возврата:', error);
            alert(`Ошибка: ${error.reason || error.message}`);
            
            refundBtn.disabled = false;
            refundBtn.textContent = 'Вернуть средства (если цель не достигнута)';
        }
    };

    // Автоматическое подключение, если MetaMask уже подключен
    if (window.ethereum.selectedAddress) {
        connectBtn.click();
    }
});