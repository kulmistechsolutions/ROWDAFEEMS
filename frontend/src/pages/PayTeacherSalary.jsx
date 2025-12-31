import { useState, useEffect, useMemo } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useSocket } from '../contexts/SocketContext'
import { MagnifyingGlassIcon, CurrencyDollarIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'

export default function PayTeacherSalary() {
  const [months, setMonths] = useState([])
  const [selectedMonthId, setSelectedMonthId] = useState(null)
  const [salaryRecords, setSalaryRecords] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_type: 'normal',
    months_advance: 1,
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const { socket } = useSocket()

  useEffect(() => {
    fetchMonths()
  }, [])


  useEffect(() => {
    if (!socket) return
    const handleSalaryPaid = () => {
      fetchSalaryRecords()
      toast.success('Salary payment recorded!')
    }
    socket.on('teacher:salary:paid', handleSalaryPaid)
    return () => socket.off('teacher:salary:paid', handleSalaryPaid)
  }, [socket])

  const fetchMonths = async () => {
    try {
      const response = await api.get('/months')
      const validMonths = (response.data || []).filter(m => m && m.year && m.month)
      setMonths(validMonths)
      const activeMonth = validMonths.find(m => m.is_active)
      if (activeMonth) {
        setSelectedMonthId(activeMonth.id)
      } else if (validMonths.length > 0) {
        setSelectedMonthId(validMonths[0].id)
      }
    } catch (error) {
      toast.error('Failed to fetch months')
    }
  }

  const fetchSalaryRecords = async () => {
    if (!selectedMonthId) return
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (departmentFilter !== 'all') {
        params.append('department', departmentFilter)
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      const url = `/teachers/salary/month/${selectedMonthId}${params.toString() ? '?' + params.toString() : ''}`
      const response = await api.get(url)
      setSalaryRecords(response.data)
    } catch (error) {
      toast.error('Failed to fetch salary records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedMonthId) {
      fetchSalaryRecords()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthId, departmentFilter, statusFilter, searchQuery])

  const handlePayClick = (teacher) => {
    setSelectedTeacher(teacher)
    const outstanding = parseFloat(teacher.outstanding_after_payment || 0)
    const isFullyPaid = teacher.status === 'paid' && outstanding === 0
    
    // If fully paid, default to advance payment
    // Otherwise, default to normal/partial based on outstanding
    setPaymentData({
      amount: isFullyPaid ? '' : (outstanding > 0 ? outstanding : teacher.total_due_this_month),
      payment_type: isFullyPaid ? 'advance' : (outstanding > 0 ? 'partial' : 'normal'),
      months_advance: 1,
      notes: ''
    })
    setShowPaymentModal(true)
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await api.post('/teachers/salary/pay', {
        teacher_id: selectedTeacher.teacher_id,
        billing_month_id: selectedMonthId,
        ...paymentData
      })
      toast.success('Salary payment recorded successfully')
      setShowPaymentModal(false)
      setSelectedTeacher(null)
      fetchSalaryRecords()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-orange-100 text-orange-800',
      advance_covered: 'bg-blue-100 text-blue-800',
      advance_applied: 'bg-purple-100 text-purple-800',
      outstanding: 'bg-yellow-100 text-yellow-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  // Calculate live totals based on filtered salary records
  const liveTotals = useMemo(() => {
    if (!salaryRecords.length) {
      return null
    }

    const totals = {
      totalSalary: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      totalAdvanceBalance: 0,
      paid: { amount: 0, count: 0 },
      unpaid: { amount: 0, count: 0 },
      partial: { amount: 0, outstanding: 0, count: 0 },
      advance_applied: { amount: 0, count: 0 }
    }

    salaryRecords.forEach(record => {
      const monthlySalary = parseFloat(record.monthly_salary || 0)
      const paid = parseFloat(record.amount_paid_this_month || 0)
      const outstanding = parseFloat(record.outstanding_after_payment || 0)
      const advanceBalance = parseFloat(record.total_advance_balance || 0)

      totals.totalSalary += monthlySalary
      totals.totalPaid += paid
      totals.totalOutstanding += outstanding
      totals.totalAdvanceBalance += advanceBalance

      if (record.status === 'paid') {
        totals.paid.amount += paid
        totals.paid.count++
      } else if (record.status === 'unpaid') {
        totals.unpaid.amount += outstanding
        totals.unpaid.count++
      } else if (record.status === 'partial') {
        totals.partial.amount += paid
        totals.partial.outstanding += outstanding
        totals.partial.count++
      } else if (record.status === 'advance_applied') {
        totals.advance_applied.amount += paid
        totals.advance_applied.count++
      }
    })

    return totals
  }, [salaryRecords])

  const selectedMonth = months.find(m => m.id === selectedMonthId)

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Pay Teacher Salary</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Process monthly salary payments for teachers</p>
      </div>

      {/* Month Selection */}
      <div className="card p-3 sm:p-4 md:p-6">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Select Month</label>
        <select
          value={selectedMonthId || ''}
          onChange={(e) => setSelectedMonthId(parseInt(e.target.value))}
          className="input text-sm sm:text-base"
        >
          <option value="">Select a month</option>
          {months.map(month => (
            <option key={month.id} value={month.id}>
              {new Date(month.year, month.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {month.is_active && ' (Active)'}
            </option>
          ))}
        </select>
      </div>

      {/* Filters and Search */}
      {selectedMonthId && (
        <div className="card p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 sm:pl-10 text-sm sm:text-base w-full"
              />
            </div>
            {/* Department Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="input w-full text-sm sm:text-base"
              >
                <option value="all">All Departments</option>
                <option value="Quraan">Quraan</option>
                <option value="Primary/Middle/Secondary">Primary / Middle / Secondary</option>
                <option value="Shareeca">Shareeca</option>
              </select>
            </div>
            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input w-full text-sm sm:text-base"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="advance_applied">Advance Applied</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Live Totals Summary */}
      {selectedMonthId && (statusFilter !== 'all' || departmentFilter !== 'all') && liveTotals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* General totals */}
          <div className="card p-4 bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-600 font-medium mb-1">Total Salary Amount</p>
            <p className="text-2xl font-bold text-blue-700">
              ${liveTotals.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card p-4 bg-green-50 border border-green-200">
            <p className="text-xs text-green-600 font-medium mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-700">
              ${liveTotals.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card p-4 bg-red-50 border border-red-200">
            <p className="text-xs text-red-600 font-medium mb-1">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-700">
              ${liveTotals.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card p-4 bg-purple-50 border border-purple-200">
            <p className="text-xs text-purple-600 font-medium mb-1">Total Advance Balance</p>
            <p className="text-2xl font-bold text-purple-700">
              ${liveTotals.totalAdvanceBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {/* Status-specific totals */}
          {statusFilter === 'paid' && liveTotals.paid.count > 0 && (
            <>
              <div className="card p-4 bg-green-50 border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">Paid Amount</p>
                <p className="text-2xl font-bold text-green-700">
                  ${liveTotals.paid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-green-50 border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">Number of Paid Teachers</p>
                <p className="text-2xl font-bold text-green-700">{liveTotals.paid.count}</p>
              </div>
            </>
          )}
          {statusFilter === 'unpaid' && (
            <>
              <div className="card p-4 bg-red-50 border border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">Unpaid Amount</p>
                <p className="text-2xl font-bold text-red-700">
                  ${liveTotals.unpaid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-red-50 border border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">Number of Unpaid Teachers</p>
                <p className="text-2xl font-bold text-red-700">{liveTotals.unpaid.count}</p>
              </div>
            </>
          )}
          {statusFilter === 'partial' && (
            <>
              <div className="card p-4 bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-600 font-medium mb-1">Partial Paid Amount</p>
                <p className="text-2xl font-bold text-orange-700">
                  ${liveTotals.partial.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-600 font-medium mb-1">Partial Outstanding</p>
                <p className="text-2xl font-bold text-orange-700">
                  ${liveTotals.partial.outstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-600 font-medium mb-1">Number of Partial Teachers</p>
                <p className="text-2xl font-bold text-orange-700">{liveTotals.partial.count}</p>
              </div>
            </>
          )}
          {statusFilter === 'advance_applied' && (
            <>
              <div className="card p-4 bg-purple-50 border border-purple-200">
                <p className="text-xs text-purple-600 font-medium mb-1">Advance Applied Amount</p>
                <p className="text-2xl font-bold text-purple-700">
                  ${liveTotals.advance_applied.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-purple-50 border border-purple-200">
                <p className="text-xs text-purple-600 font-medium mb-1">Number of Advance Applied</p>
                <p className="text-2xl font-bold text-purple-700">{liveTotals.advance_applied.count}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      {selectedMonthId && (
        <div className="hidden lg:block card overflow-hidden p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : salaryRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No salary records found for this month. Please set up the month first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance Used</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salaryRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.teacher_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${parseFloat(record.monthly_salary).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                        ${parseFloat(record.advance_balance_used || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${parseFloat(record.total_due_this_month).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                        ${parseFloat(record.amount_paid_this_month || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                        ${parseFloat(record.outstanding_after_payment || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handlePayClick(record)}
                          className="btn btn-primary text-sm"
                          disabled={loading}
                          title={record.status === 'paid' ? 'Give Advance Payment' : 'Pay Salary'}
                        >
                          <CurrencyDollarIcon className="h-4 w-4 mr-1 inline" />
                          Pay
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mobile Card View */}
      {selectedMonthId && (
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : salaryRecords.length === 0 ? (
            <div className="card p-6 text-center text-gray-500">
              No salary records found for this month. Please set up the month first.
            </div>
          ) : (
            salaryRecords.map((record) => (
              <div key={record.id} className="card p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{record.teacher_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{record.department}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ml-2 flex-shrink-0 ${getStatusBadge(record.status)}`}>
                    {record.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Original Salary:</span>
                    <span className="font-medium text-gray-900">${parseFloat(record.monthly_salary).toLocaleString()}</span>
                  </div>
                  {parseFloat(record.advance_balance_used || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Advance Used:</span>
                      <span className="font-semibold text-blue-600">${parseFloat(record.advance_balance_used || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Due:</span>
                    <span className="font-medium text-gray-900">${parseFloat(record.total_due_this_month).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-semibold text-green-600">${parseFloat(record.amount_paid_this_month || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-semibold text-red-600">${parseFloat(record.outstanding_after_payment || 0).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePayClick(record)}
                  className="btn btn-primary w-full text-sm"
                  disabled={loading}
                  title={record.status === 'paid' ? 'Give Advance Payment' : 'Pay Salary'}
                >
                  <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                  Pay
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={(e) => {
          if (e.target === e.currentTarget) setShowPaymentModal(false)
        }}>
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Pay Salary</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs sm:text-sm text-gray-600">Teacher: <span className="font-semibold">{selectedTeacher.teacher_name}</span></p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Monthly Salary: <span className="font-semibold">${parseFloat(selectedTeacher.monthly_salary || 0).toLocaleString()}</span></p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Outstanding: <span className="font-semibold text-red-600">${parseFloat(selectedTeacher.outstanding_after_payment || 0).toLocaleString()}</span></p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Status: <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedTeacher.status)}`}>{selectedTeacher.status}</span></p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                <select
                  className="input text-sm sm:text-base"
                  value={paymentData.payment_type}
                  onChange={(e) => {
                    const newType = e.target.value
                    setPaymentData({ 
                      ...paymentData, 
                      payment_type: newType,
                      // Auto-set amount based on payment type
                      amount: newType === 'advance' ? '' : (newType === 'partial' ? (selectedTeacher.outstanding_after_payment || '') : (selectedTeacher.total_due_this_month || ''))
                    })
                  }}
                >
                  <option value="normal">Full Payment</option>
                  <option value="partial">Partial Payment</option>
                  <option value="advance">Advance Payment</option>
                </select>
                {selectedTeacher.status === 'paid' && paymentData.payment_type !== 'advance' && (
                  <p className="text-xs text-orange-600 mt-1">Note: Salary is already paid. Please select "Advance Payment" to give advance.</p>
                )}
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input text-sm sm:text-base"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                />
              </div>
              {paymentData.payment_type === 'advance' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Months in Advance</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input text-sm sm:text-base"
                    value={paymentData.months_advance}
                    onChange={(e) => setPaymentData({ ...paymentData, months_advance: parseInt(e.target.value) })}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  className="input text-sm sm:text-base"
                  rows="3"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button type="submit" className="flex-1 btn btn-primary text-sm sm:text-base" disabled={loading}>
                  {loading ? 'Processing...' : 'Process Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 btn btn-outline text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

