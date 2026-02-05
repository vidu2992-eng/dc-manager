import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, ArrowDownLeft, ArrowUpRight, Wallet, UserPlus, RefreshCw, LogOut } from 'lucide-react';
import Auth from './Auth'; // Import the new Auth component

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function App() {
  // --- AUTH STATE ---
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  // --- APP STATE ---
  const [people, setPeople] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState('credit');

  // --- LOGOUT HANDLER ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setPeople([]);
    setTransactions([]);
  };

  // --- FETCH DATA (Only if Token exists) ---
  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // We must attach the token to every request header
      const config = { headers: { 'x-auth-token': token } };
      
      const [pRes, tRes] = await Promise.all([
        axios.get(`${API_URL}/people`, config),
        axios.get(`${API_URL}/transactions`, config)
      ]);
      setPeople(pRes.data);
      setTransactions(tRes.data);
    } catch (error) {
      console.error("Auth Error:", error);
      if (error.response && error.response.status === 401) {
        handleLogout(); // Token expired or invalid
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- API HELPERS (Attaches Token Automatically) ---
  const apiCall = async (method, endpoint, data = null) => {
    try {
      const config = { headers: { 'x-auth-token': token } };
      if (method === 'POST') return await axios.post(`${API_URL}${endpoint}`, data, config);
      if (method === 'DELETE') return await axios.delete(`${API_URL}${endpoint}`, config);
    } catch (err) {
      alert("Operation failed");
      throw err;
    }
  };

  // --- ACTIONS ---
  const addPerson = async (e) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    const res = await apiCall('POST', '/people', { name: newPersonName });
    if(res) {
      setPeople([res.data, ...people]);
      setNewPersonName('');
    }
  };

  const deletePerson = async (id, e) => {
    e.stopPropagation();
    if(!confirm("Delete this person?")) return;
    await apiCall('DELETE', `/people/${id}`);
    setPeople(people.filter(p => p._id !== id));
    setTransactions(transactions.filter(t => t.personId !== id));
    if (selectedPersonId === id) setSelectedPersonId(null);
  };

  const addTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !selectedPersonId) return;
    const res = await apiCall('POST', '/transactions', {
      personId: selectedPersonId,
      amount: parseFloat(amount),
      description: desc || 'Untitled',
      type
    });
    if(res) {
      setTransactions([res.data, ...transactions]);
      setAmount('');
      setDesc('');
    }
  };

  const settleBalance = async (pid, netAmount) => {
    if (netAmount === 0) return;
    const settleType = netAmount > 0 ? 'debit' : 'credit';
    const res = await apiCall('POST', '/transactions', {
      personId: pid,
      amount: Math.abs(netAmount),
      description: 'Full Settlement',
      type: settleType
    });
    if(res) setTransactions([res.data, ...transactions]);
  };

  // --- CALCULATIONS ---
  const getStats = (pid) => {
    const txs = transactions.filter(t => t.personId === pid);
    const credits = txs.filter(t => t.type === 'credit').reduce((a, b) => a + b.amount, 0);
    const debits = txs.filter(t => t.type === 'debit').reduce((a, b) => a + b.amount, 0);
    return { credits, debits, net: credits - debits };
  };

  const grandTotals = people.reduce((acc, p) => {
    const stats = getStats(p._id);
    return { 
      totalCredits: acc.totalCredits + stats.credits, 
      totalDebits: acc.totalDebits + stats.debits 
    };
  }, { totalCredits: 0, totalDebits: 0 });

  const activePerson = people.find(p => p._id === selectedPersonId);
  const activeStats = activePerson ? getStats(activePerson._id) : null;
  const activeTxs = activePerson ? transactions.filter(t => t.personId === activePerson._id) : [];

  // --- RENDER ---

  // 1. If not logged in, show Auth Screen
  if (!token) {
    return <Auth onLogin={(t) => setToken(t)} />;
  }

  // 2. Main App Interface
  return (
    <div className="min-h-screen p-4 md:p-6 bg-dark-900 font-sans text-gray-200">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[90vh]">
        
        {/* SIDEBAR */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-brand-500 p-2 rounded-lg"><Wallet className="text-white w-6 h-6"/></div>
              <h1 className="text-2xl font-bold tracking-tight text-white">D/C Manager</h1>
            </div>
            {/* LOGOUT BUTTON */}
            <button onClick={handleLogout} className="p-2 bg-dark-800 text-gray-400 hover:text-red-400 rounded-lg transition-colors" title="Logout">
              <LogOut size={20} />
            </button>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
              <p className="text-[10px] uppercase font-bold text-gray-500">Receivable</p>
              <p className="text-xl font-bold text-green-500">Rs.{grandTotals.totalCredits}</p>
            </div>
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
              <p className="text-[10px] uppercase font-bold text-gray-500">Payable</p>
              <p className="text-xl font-bold text-red-500">Rs.{grandTotals.totalDebits}</p>
            </div>
          </div>

          {/* Add Person */}
          <form onSubmit={addPerson} className="relative">
            <input type="text" placeholder="Add Name..." value={newPersonName} onChange={e=>setNewPersonName(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg py-3 px-4 text-white focus:border-brand-500 outline-none" />
            <button type="submit" className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-white bg-dark-700 rounded"><UserPlus size={18}/></button>
          </form>

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {isLoading ? <p className="text-center text-gray-600 mt-10">Loading...</p> : people.map(p => {
              const { net } = getStats(p._id);
              return (
                <div key={p._id} onClick={()=>setSelectedPersonId(p._id)} 
                  className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all
                  ${selectedPersonId === p._id ? 'bg-brand-900/40 border-brand-500' : 'bg-dark-800 border-dark-700 hover:border-gray-600'}`}>
                  <div>
                    <h3 className={`font-semibold ${selectedPersonId===p._id ? 'text-white':'text-gray-300'}`}>{p.name}</h3>
                    <p className={`text-xs mt-1 ${net > 0 ? 'text-green-400': net < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {net > 0 ? `Owes Rs.${net}` : net < 0 ? `Owe Rs.${Math.abs(net)}` : 'Settled'}
                    </p>
                  </div>
                  <button onClick={(e)=>deletePerson(p._id, e)} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                </div>
              );
            })}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="md:col-span-8 bg-dark-800 rounded-2xl border border-dark-700 flex flex-col overflow-hidden shadow-2xl relative">
          {!activePerson ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
              <Wallet size={48} className="opacity-20 mb-4"/>
              <p>Select a person to manage</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-6 border-b border-dark-700 bg-dark-800 flex justify-between items-start z-10">
                <div>
                  <h2 className="text-3xl font-bold text-white">{activePerson.name}</h2>
                  <div className="flex gap-3 mt-2 text-xs font-mono">
                    <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded">CREDIT: {activeStats.credits}</span>
                    <span className="bg-red-500/10 text-red-500 px-2 py-1 rounded">DEBIT: {activeStats.debits}</span>
                  </div>
                </div>
                <div className="text-right bg-dark-900 p-3 rounded-lg border border-dark-700">
                  <p className="text-[10px] uppercase text-gray-500 font-bold">Balance</p>
                  <p className={`text-2xl font-bold ${activeStats.net >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                    {activeStats.net >= 0 ? '+' : '-'}{Math.abs(activeStats.net)}
                  </p>
                </div>
              </div>

              {/* Transactions */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-dark-900/50 custom-scrollbar">
                {activeTxs.map(tx => (
                  <div key={tx._id} className="flex justify-between items-center p-3 bg-dark-800 border border-dark-700 rounded-lg hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type==='credit'?'bg-green-500/10 text-green-500':'bg-red-500/10 text-red-500'}`}>
                        {tx.type==='credit' ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{tx.description}</p>
                        <p className="text-[10px] text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold ${tx.type==='credit'?'text-green-500':'text-red-500'}`}>
                      {tx.type==='credit'?'+':'-'} {tx.amount}
                    </span>
                  </div>
                ))}
              </div>

              {/* Input Area */}
              <div className="p-5 bg-dark-800 border-t border-dark-700">
                {activeStats.net !== 0 && (
                  <button onClick={()=>settleBalance(activePerson._id, activeStats.net)} className="w-full mb-4 py-2 text-xs flex items-center justify-center gap-2 text-brand-400 bg-brand-900/20 border border-brand-500/30 rounded hover:bg-brand-900/40">
                    <RefreshCw size={14}/> Settle Balance (Clear Rs.{Math.abs(activeStats.net)})
                  </button>
                )}
                
                <form onSubmit={addTransaction} className="flex flex-col md:flex-row gap-3">
                  <div className="flex bg-dark-900 rounded-lg border border-dark-700 p-1 shrink-0">
                    <button type="button" onClick={()=>setType('credit')} className={`px-3 py-2 rounded text-sm font-bold ${type==='credit'?'bg-green-600 text-white':'text-gray-500'}`}>In</button>
                    <button type="button" onClick={()=>setType('debit')} className={`px-3 py-2 rounded text-sm font-bold ${type==='debit'?'bg-red-600 text-white':'text-gray-500'}`}>Out</button>
                  </div>
                  <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)} className="w-24 bg-dark-900 border border-dark-700 rounded-lg px-3 text-white focus:border-brand-500 outline-none"/>
                  <input type="text" placeholder="Description..." value={desc} onChange={e=>setDesc(e.target.value)} className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-white focus:border-brand-500 outline-none"/>
                  <button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white p-3 rounded-lg"><Plus size={20}/></button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;