import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.css';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import { Link } from 'react-router-dom'
import Web3 from 'web3'


const Patient = ({healthTrust, account, ethValue}) => {
  const [patient, setPatient] = useState(null);
  const [docEmail, setDocEmail] = useState("");
  const [docList, setDocList] = useState([]);
  const [transactionsList, setTransactionsList] = useState([]);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [patientRecord, setPatientRecord] = useState(null);

  const getPatientData = async () => {
      var patient = await healthTrust.methods.patientInfo(account).call();
      setPatient(patient);
  }
  const giveAccess = (e) => {
    e.preventDefault();
    healthTrust.methods.permitAccess(docEmail).send({from: account}).on('transactionHash', (hash) => {
      return window.location.href = '/login'
    })
  }
  const revokeAccess = async (email) => {
    var addr = await healthTrust.methods.emailToAddress(email).call();
    healthTrust.methods.revokeAccess(addr).send({from: account}).on('transactionHash', (hash) => {
      return window.location.href = '/login';
    });
  }
  const getDoctorAccessList = async () => {
    var doc = await healthTrust.methods.getPatientDoctorList(account).call();
    let dt = [];
    for(let i=0; i<doc.length; i++){
      let doctor = await healthTrust.methods.doctorInfo(doc[i]).call();
      dt = [...dt, doctor]
    }
    setDocList(dt)
  }
  const getTransactionsList = async () => {
    var transactionsIdList = await healthTrust.methods.getPatientTransactions(account).call();
    let tr = [];
    for(let i=transactionsIdList.length-1; i>=0; i--){
        let transaction = await healthTrust.methods.transactions(transactionsIdList[i]).call();
        let doctor = await healthTrust.methods.doctorInfo(transaction.receiver).call();
        transaction = {...transaction, id: transactionsIdList[i], doctorEmail: doctor.email}
        tr = [...tr, transaction];
    }
    setTransactionsList(tr);
  }
  const settlePayment = async (e, transaction) => {
    let value = transaction.value/ethValue;
    value = Number(value.toFixed(18));
      healthTrust.methods.settleTransactionsByPatient(transaction.id).send({from: account, value: Web3.utils.toWei(value.toString(), 'Ether')}).on('transactionHash', (hash) => {
        return window.location.href = '/login'
    })
  }

  const handleCloseRecordModal = () => setShowRecordModal(false);
  const handleShowRecordModal = async () => {
    var record = {}
    await fetch(`${process.env.REACT_APP_INFURA_DEDICATED_GATEWAY}/ipfs/${patient.record}`)
      .then(res => res.json())
      .then(data => record = data)
    await setPatientRecord(record);
    await setShowRecordModal(true);
  }

  useEffect(() => {
    if(account === "") return window.location.href = '/login'
    if(!patient) getPatientData()
    if(docList.length === 0) getDoctorAccessList();
    if(transactionsList.length === 0) getTransactionsList();
  }, [patient, docList, transactionsList])

  return (
    <div>
      { patient ?
        <>
          <div className='box'>
            <h2>Patient's Profile</h2>
            <Form>
              <Form.Group>
                <Form.Label>Name: {patient.name}</Form.Label>
              </Form.Group>
              <Form.Group>
                <Form.Label>Email address: {patient.email}</Form.Label>
              </Form.Group>
              <Form.Group>
                <Form.Label>Age: {patient.age}</Form.Label>
              </Form.Group>
              <Form.Group>
                <Form.Label>Address: {account}</Form.Label>
              </Form.Group>
            </Form>
            <div>
              <span>Your records are stored here: &nbsp; &nbsp;</span>
              <Button variant="coolColor" style={{width: "20%", height: "4vh"}} onClick={handleShowRecordModal}>View Records</Button>
            </div>
          </div>
          <div className='box'>
            <h2>Share Your Medical Record with Doctor</h2>
            <Form onSubmit={giveAccess}>
              <Form.Group className="mb-3">
                <Form.Label>Email:</Form.Label>
                <Form.Control required type="email" value={docEmail} onChange={(e) => setDocEmail(e.target.value)} placeholder="Enter doctor's email"></Form.Control>
              </Form.Group>
              <Button variant="coolColor" type="submit">
                  Submit
              </Button>
            </Form>
            <br />
            <h4>List of Doctor's you have given access to your medical records</h4>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>Sr.&nbsp;No.</th>
                  <th>Doctor&nbsp;Name</th>
                  <th>Doctor&nbsp;Email</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                { docList.length > 0 ? 
                  docList.map((doc, idx) => {
                    return (
                      <tr key={idx}>
                        <td>{idx+1}</td>
                        <td>Dr. {doc.name}</td>
                        <td>{doc.email}</td>
                        <td><Button className='btn-danger' onClick={() => revokeAccess(doc.email)}>Revoke</Button></td>
                      </tr>
                    )
                  })
                  : <></>
                }
              </tbody>
            </Table>
          </div>
          <div className='box'>
            <h2>List of Transactions</h2>
              <Table striped bordered hover size="sm">
                <thead>
                    <tr>
                      <th>Sr.No.</th>
                      <th>Doctor&nbsp;Email</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                  { transactionsList.length > 0 ? 
                    transactionsList.map((transaction, idx) => {
                      return (
                        <tr key={idx+1}>
                          <td>{idx+1}</td>
                          <td>{transaction.doctorEmail}</td>
                          <td>{transaction.value}</td>
                          <td>{transaction.settled ? <span className='badge rounded-pill bg-success'>Settled</span> : <span className='badge rounded-pill bg-warning'>Pending</span>}</td>
                          <td>
                            { !transaction.settled ?
                              <Button className='btn-coolColor' onClick={(e) => settlePayment(e, transaction)}>Pay</Button>
                              : <Button className='btn-coolColor' disabled>Pay</Button>
                            }
                          </td>
                        </tr>
                      )
                    })
                    : <></>
                  }
                </tbody>
              </Table>
          </div>
          { patientRecord ? <Modal id="modal" size="lg" centered show={showRecordModal} onHide={handleCloseRecordModal}>
            <Modal.Header closeButton>
              <Modal.Title id="modalTitle">Medical Record:</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                  <Form.Group>
                    <Form.Label>Patient Name: {patientRecord.name}</Form.Label>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Patient Email: {patientRecord.email}</Form.Label>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Patient Age: {patientRecord.age}</Form.Label>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Address: {patientRecord.address}</Form.Label>
                  </Form.Group>
                  <Table id='records' striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Sr.&nbsp;No.</th>
                        <th>Doctor&nbsp;Email</th>
                        <th>Date</th>
                        <th>Disease</th>
                        <th>Treatment</th>
                        <th>Prescription</th>
                      </tr>
                    </thead>
                    <tbody>
                      { patientRecord.treatments.length > 0 ?
                          patientRecord.treatments.map((treatment, idx) => {
                            return (
                              <tr key={idx+1}>
                                <td>{idx+1}</td>
                                <td>{treatment.doctorEmail}</td>
                                <td>{treatment.date}</td>
                                <td>{treatment.disease}</td>
                                <td>{treatment.treatment}</td>
                                <td>
                                  { treatment.prescription ? 
                                    <Link to={`${process.env.REACT_APP_INFURA_DEDICATED_GATEWAY}/ipfs/${treatment.prescription}`} target="_blank"><Button variant="coolColor">View</Button></Link>
                                    : "No document uploaded"
                                  }
                                </td>
                              </tr>
                            )
                          })
                        : <></>
                      }
                    </tbody>
                  </Table>
                </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseRecordModal}>
                Close
              </Button>
            </Modal.Footer>
          </Modal> : <></>
          }
        </>
        : <div>Loading...</div>
      }
    </div>
  )
}


export default Patient


