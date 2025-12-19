import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

export default function UserMonitoring() {
  const [users, setUsers] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [useDateRange, setUseDateRange] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [dailyIncome, setDailyIncome] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [showTransactions, setShowTransactions] = useState(false)
  const [selectedUserForTransactions, setSelectedUserForTransactions] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (selectedDate) {
      fetchDailyIncome()
    }
  }, [selectedDate, selectedUserId])

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users')
      setUsers(response.data)
    } catch (error) {
      toast.error('Failed to fetch users')
    }
  }

  const fetchDailyIncome = async () => {
    try {
      setLoading(true)
      const params = { date: selectedDate }
      if (selectedUserId) {
        params.user_id = selectedUserId
      }
      const response = await api.get('/user-monitoring/daily-income', { params })
      setDailyIncome(response.data.daily_income || [])
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to fetch daily income')
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (userId = null) => {
    try {
      setLoadingTransactions(true)
      const params = { date: selectedDate }
      if (userId || selectedUserId) {
        params.user_id = userId || selectedUserId
      }
      const response = await api.get('/user-monitoring/transactions', { params })
      setTransactions(response.data.transactions || [])
      setShowTransactions(true)
      if (userId) {
        const user = users.find(u => u.id === userId)
        setSelectedUserForTransactions(user)
      } else {
        setSelectedUserForTransactions(null)
      }
    } catch (error) {
      toast.error('Failed to fetch transactions')
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleExportDailyIncome = async () => {
    try {
      const params = { date: selectedDate }
      if (selectedUserId) {
        params.user_id = selectedUserId
      }
      const response = await api.get('/user-monitoring/daily-income/export', {
        params,
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      const contentDisposition = response.headers['content-disposition']
      let filename = `daily_income_${selectedDate}.xlsx`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('Daily income report exported successfully')
    } catch (error) {
      toast.error('Failed to export daily income report')
    }
  }

  const handleExportTransactions = async () => {
    try {
      const params = {}
      
      // If date range is enabled, use date range, otherwise use single date
      if (useDateRange && startDate && endDate) {
        params.start_date = startDate
        params.end_date = endDate
      } else if (selectedDate) {
        params.date = selectedDate
      } else {
        toast.error('Please select a date or date range')
        return
      }

      // Add user_id only if a specific user is selected
      if (selectedUserId) {
        params.user_id = selectedUserId
      }
      
      const response = await api.get('/user-monitoring/transactions/export', {
        params,
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      const contentDisposition = response.headers['content-disposition']
      let filename = `transactions_${selectedDate}.xlsx`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1])
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      const exportMessage = selectedUserId 
        ? `Transactions exported for ${users.find(u => u.id === parseInt(selectedUserId))?.username || 'selected user'}`
        : 'All users transactions exported successfully'
      toast.success(exportMessage)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to export transactions')
    }
  }

  const handleExportUserComplete = async (userId) => {
    try {
      if (!selectedDate) {
        toast.error('Please select a date first')
        return
      }
      
      const response = await api.get('/user-monitoring/user-complete-export', {
        params: { 
          date: selectedDate,
          user_id: userId
        },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      const contentDisposition = response.headers['content-disposition']
      let filename = `user_report_${selectedDate}.xlsx`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i)
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1])
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast.success('User complete report exported successfully')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to export user complete report')
    }
  }

  const totalCollected = dailyIncome.reduce((sum, item) => sum + item.total_collected, 0)
  const totalTransactions = dailyIncome.reduce((sum, item) => sum + item.transaction_count, 0)

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">User Daily Income & Transactions</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Monitor staff collections and transactions (Admin Only)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 sm:p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Filter */}
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={useDateRange}
                className="input pl-9 sm:pl-10 text-sm sm:text-base w-full disabled:bg-gray-100"
              />
            </div>

            {/* User Filter */}
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="input pl-9 sm:pl-10 text-sm sm:text-base w-full appearance-none"
              >
                <option value="">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useDateRange"
                checked={useDateRange}
                onChange={(e) => {
                  setUseDateRange(e.target.checked)
                  if (!e.target.checked) {
                    setStartDate('')
                    setEndDate('')
                  }
                }}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="useDateRange" className="text-sm text-gray-700 cursor-pointer">
                Use Date Range
              </label>
            </div>
          </div>

          {/* Date Range Fields */}
          {useDateRange && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start Date"
                  className="input pl-9 sm:pl-10 text-sm sm:text-base w-full"
                />
              </div>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End Date"
                  className="input pl-9 sm:pl-10 text-sm sm:text-base w-full"
                />
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportDailyIncome}
              className="btn btn-outline flex-1 text-sm flex items-center justify-center gap-2"
              disabled={loading || !selectedDate}
              title={selectedUserId ? `Export daily income for selected user` : 'Export daily income for all users'}
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Export Income</span>
              <span className="sm:hidden">Income</span>
            </button>
            <button
              onClick={handleExportTransactions}
              className="btn btn-outline flex-1 text-sm flex items-center justify-center gap-2"
              disabled={loadingTransactions || (!selectedDate && !useDateRange) || (!useDateRange && !selectedDate) || (useDateRange && (!startDate || !endDate))}
              title={selectedUserId ? `Export all transactions for ${users.find(u => u.id === parseInt(selectedUserId))?.username || 'selected user'}` : 'Export all transactions for all users'}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">
                {selectedUserId ? 'Export User Transactions' : 'Export All Transactions'}
              </span>
              <span className="sm:hidden">Transactions</span>
            </button>
          </div>
        </div>
      </div>

      {/* Daily Income Summary */}
      <div className="card p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Daily Income Summary</h2>
          <div className="text-sm text-gray-600">
            Total: <span className="font-bold text-green-600">${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {' | '}
            Transactions: <span className="font-bold">{totalTransactions}</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : dailyIncome.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No income data found for the selected date
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Collected</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dailyIncome.map((item) => (
                  <tr key={item.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.username}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {item.transaction_count}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                      ${item.total_collected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => fetchTransactions(item.user_id)}
                          className="text-primary-600 hover:text-primary-900 font-medium flex items-center gap-1"
                          title="View transactions"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        <button
                          onClick={() => handleExportUserComplete(item.user_id)}
                          className="text-green-600 hover:text-green-900 font-medium flex items-center gap-1"
                          title="Export user complete report (summary + transactions)"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Export</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions List */}
      {showTransactions && (
        <div className="card p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Transactions
              {selectedUserForTransactions && ` - ${selectedUserForTransactions.username}`}
            </h2>
            <div className="flex items-center gap-2">
              {selectedUserForTransactions && (
                <button
                  onClick={() => handleExportUserComplete(selectedUserForTransactions.id)}
                  className="btn btn-outline text-sm flex items-center gap-2"
                  title="Export user complete report"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Export Complete Report</span>
                  <span className="sm:hidden">Export</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowTransactions(false)
                  setTransactions([])
                  setSelectedUserForTransactions(null)
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>

          {loadingTransactions ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.payment_date).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.parent_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {transaction.phone_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {transaction.month}/{transaction.year}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                        ${parseFloat(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.payment_type === 'advance' ? 'bg-blue-100 text-blue-800' :
                          transaction.payment_type === 'partial' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {transaction.payment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {transaction.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

