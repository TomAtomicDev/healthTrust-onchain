// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract HealthTrust {
    string public name;
    address[] public patientList;
    address[] public doctorList;
    uint public transactionCount;
    mapping (uint => Transactions) public transactions;
    mapping (address => Patient) public patientInfo;
    mapping (address => Doctor) public doctorInfo;
    mapping (string => address) public emailToAddress;
    mapping (string => uint) public emailToDesignation;

    struct Patient {
        string name;
        string email;
        uint age;
        string record;
        bool exists;
        bool policyActive;
        uint[] transactions;
        address[] doctorAccessList;
    }
    struct Doctor {
        string name;
        string email;
        bool exists;
        uint[] transactions;
        address[] patientAccessList;
    }
    struct Transactions {
        address sender;
        address receiver;
        uint value;
        bool settled;
    }
    

    constructor(){
        name = "healthtrust";
        transactionCount = 0;
    }

    function register(string memory _name, uint _age, uint _designation, string memory _email, string memory _hash) public {
        require(msg.sender != address(0));
        require(bytes(_name).length > 0);
        require(bytes(_email).length > 0);
        require(emailToAddress[_email] == address(0));
        require(emailToDesignation[_email] == 0);
        address _addr = msg.sender;
        require(!patientInfo[_addr].exists);
        require(!doctorInfo[_addr].exists);
        if(_designation == 1){
            require(_age > 0);
            require(bytes(_hash).length > 0);
            Patient storage pinfo = patientInfo[_addr];
            pinfo.name = _name;
            pinfo.email = _email;
            pinfo.age = _age;
            pinfo.record = _hash;
            pinfo.exists = true;
            pinfo.doctorAccessList;
            patientList.push(_addr);
            emailToAddress[_email] = _addr;
            emailToDesignation[_email] = _designation;
        }
        else if (_designation == 2){
            Doctor storage dinfo = doctorInfo[_addr];
            dinfo.name = _name;
            dinfo.email = _email;
            dinfo.exists = true;
            doctorList.push(_addr);
            emailToAddress[_email] = _addr;
            emailToDesignation[_email] = _designation;
        }
        else{
            revert();
        }
    }

    function login(address _addr) view public returns (uint){
        require(_addr != address(0));
        if(patientInfo[_addr].exists){
            return 1;
        }else if(doctorInfo[_addr].exists){
            return 2;
        }else{
            return 0;
        }
    }


    function getPatientDoctorList(address _addr) view public returns (address[] memory){
        require(_addr != address(0));
        require(patientInfo[_addr].exists);
        return (patientInfo[_addr].doctorAccessList);
    }
    function getDoctorPatientList(address _addr) view public returns (address[] memory){
        require(_addr != address(0));
        require(doctorInfo[_addr].exists);
        return (doctorInfo[_addr].patientAccessList);
    }
    function getPatientTransactions(address _addr) view public returns (uint[] memory){
        require(_addr != address(0));
        require(patientInfo[_addr].exists);
        return (patientInfo[_addr].transactions);
    }
    function getDoctorTransactions(address _addr) view public returns (uint[] memory){
        require(_addr != address(0));
        require(doctorInfo[_addr].exists);
        return (doctorInfo[_addr].transactions);
    }
    function getAllDoctorsAddress() view public returns (address[] memory) {
        return doctorList;
    }

    // Called By Patient
    function permitAccess(string memory _email) public {
        require(bytes(_email).length > 0);
        require(msg.sender != address(0));
        address _addr = emailToAddress[_email];
        require(_addr != address(0));
        require(patientInfo[msg.sender].exists);
        require(doctorInfo[_addr].exists);
        Doctor storage dinfo = doctorInfo[_addr];
        Patient storage pinfo = patientInfo[msg.sender];
        dinfo.patientAccessList.push(msg.sender);
        pinfo.doctorAccessList.push(_addr);
    }
    
    // Called by Patient
    function revokeAccess(address _addr) public{
        require(_addr != address(0));
        require(msg.sender != address(0));
        require(doctorInfo[_addr].exists);
        require(patientInfo[msg.sender].exists);
        removeFromList(doctorInfo[_addr].patientAccessList, msg.sender);
        removeFromList(patientInfo[msg.sender].doctorAccessList, _addr);
    }

    // Called by Patient
    function settleTransactionsByPatient(uint _id) payable public {
        require(msg.sender != address(0));
        require(patientInfo[msg.sender].exists);
        require(msg.sender == transactions[_id].sender);
        require(!transactions[_id].settled);
        address _addr = transactions[_id].receiver;
        require(doctorInfo[_addr].exists);
        payable(_addr).transfer(msg.value);
        transactions[_id].settled = true;
    }

    // Called by Doctor
    function updatePatientRecordAndAddTransaction(address paddr, string memory _hash, uint charges) public {
        require(msg.sender != address(0));
        require(paddr != address(0));
        require(doctorInfo[msg.sender].exists);
        require(patientInfo[paddr].exists);
        require(bytes(_hash).length > 0);
        bool patientFound = false;
        for(uint i = 0;i<doctorInfo[msg.sender].patientAccessList.length;i++){
            if(doctorInfo[msg.sender].patientAccessList[i]==paddr){
                patientFound = true;
            }
        }
        if(!patientFound){
            revert();
        }
        patientInfo[paddr].record = _hash;

        transactionCount++;
        transactions[transactionCount] = Transactions(paddr, msg.sender, charges, false);
        doctorInfo[msg.sender].transactions.push(transactionCount);
        patientInfo[paddr].transactions.push(transactionCount);
        
    }

    function removeFromList(address[] storage Array, address addr) internal returns (uint){
        require(addr != address(0));
        bool check = false;
        uint del_index = 0;
        for(uint i = 0; i<Array.length; i++){
            if(Array[i] == addr){
                check = true;
                del_index = i;
            }
        }
        if(!check) revert();
        else{
            if(Array.length > 1){
                Array[del_index] = Array[Array.length - 1];
            }
            Array.pop();
        }
        return del_index;
    }
}
