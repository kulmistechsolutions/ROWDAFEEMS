import { useState, useEffect, useMemo, useCallback } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useSocket } from '../contexts/SocketContext'
import { 
  MagnifyingGlassIcon, 
  CurrencyDollarIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function CollectFee() {
  const [months, setMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [selectedMonthId, setSelectedMonthId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedParent, setSelectedParent] = useState(null)
  const [parentFee, setParentFee] = useState(null)
  const [allFees, setAllFees] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_type: 'normal',
    months_advance: 1,
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [loadingFees, setLoadingFees] = useState(false)
  const { socket } = useSocket()

  useEffect(() => {
    fetchMonths()
  }, [])

  // Refresh months when page becomes visible after being hidden (e.g., navigating back)
  useEffect(() => {
    let wasHidden = false
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true
      } else if (document.visibilityState === 'visible' && wasHidden) {
        // Only refresh if page was hidden and now visible again
        fetchMonths()
        wasHidden = false
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])


  // Listen for real-time payment updates and month creation
  useEffect(() => {
    if (!socket) return

    const handlePaymentCreated = (data) => {
      if (selectedMonthId && data.billing_month_id === selectedMonthId) {
        fetchAllFees()
        toast.success('Payment received in real-time!', { icon: '💰' })
      }
    }

    const handleParentUpdated = (data) => {
      if (selectedMonthId) {
        fetchAllFees()
      }
    }

    const handleMonthUpdated = (data) => {
      if (selectedMonthId && data.billing_month_id === selectedMonthId) {
        fetchAllFees()
      }
    }

    const handleMonthCreated = (data) => {
      // Refresh months list when a new month is created
      fetchMonths()
      toast.success('New month created! Refreshing...', { icon: '📅' })
    }

    socket.on('payment:created', handlePaymentCreated)
    socket.on('parent:updated', handleParentUpdated)
    socket.on('month:updated', handleMonthUpdated)
    socket.on('month:created', handleMonthCreated)

    return () => {
      socket.off('payment:created', handlePaymentCreated)
      socket.off('parent:updated', handleParentUpdated)
      socket.off('month:updated', handleMonthUpdated)
      socket.off('month:created', handleMonthCreated)
    }
  }, [socket, selectedMonthId])

  const fetchMonths = async () => {
    try {
      const response = await api.get('/months')
      // Filter out invalid months and ensure year/month are valid numbers
      const validMonths = (response.data || []).filter(m => 
        m && 
        typeof m.year === 'number' && 
        typeof m.month === 'number' && 
        !isNaN(m.year) && 
        !isNaN(m.month) &&
        m.year > 0 && 
        m.month >= 1 && 
        m.month <= 12
      )
      setMonths(validMonths)
      
      // Always prioritize active month - if one exists, select it
      const activeMonth = validMonths.find(m => m.is_active)
      if (activeMonth) {
        // Always select the active month (it's the most recent one created)
        setSelectedMonthId(activeMonth.id)
        setSelectedMonth(activeMonth)
      } else if (validMonths.length > 0) {
        // If no active month, select the most recent one
        const sortedMonths = [...validMonths].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year
          return b.month - a.month
        })
        setSelectedMonthId(sortedMonths[0].id)
        setSelectedMonth(sortedMonths[0])
      }
    } catch (error) {
      toast.error('Failed to fetch months')
      setMonths([])
    }
  }

  const fetchAllFees = async () => {
    if (!selectedMonthId) return
    
    try {
      setLoadingFees(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (branchFilter !== 'all') {
        params.append('branch', branchFilter)
      }
      const url = `/months/${selectedMonthId}/fees${params.toString() ? '?' + params.toString() : ''}`
      const response = await api.get(url)
      setAllFees(response.data)
    } catch (error) {
      toast.error('Failed to fetch fees')
    } finally {
      setLoadingFees(false)
    }
  }

  useEffect(() => {
    if (selectedMonthId) {
      fetchAllFees()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonthId, statusFilter, branchFilter])

  // Memoize filtered fees for better performance (backend handles status and branch, frontend only handles search)
  const filteredFees = useMemo(() => {
    let filtered = [...allFees]

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(fee => 
        fee.parent_name?.toLowerCase().includes(query) ||
        fee.phone_number?.includes(searchQuery)
      )
    }

    return filtered
  }, [allFees, searchQuery])

  // Calculate live totals based on filtered fees (works with any filter combination)
  const liveTotals = useMemo(() => {
    if (!filteredFees.length) {
      return null
    }

    const totals = {
      paid: {
        amount: 0,
        count: 0
      },
      unpaid: {
        amount: 0,
        count: 0
      },
      partial: {
        paidAmount: 0,
        remainingBalance: 0,
        count: 0
      },
      outstanding: {
        amount: 0,
        count: 0
      },
      advanced: {
        amount: 0,
        count: 0
      }
    }

    filteredFees.forEach(fee => {
      // Calculate totals based on actual status (works with any filter combination)
      const outstanding = parseFloat(fee.outstanding_after_payment || 0)
      const paid = parseFloat(fee.amount_paid_this_month || 0)
      const totalDue = parseFloat(fee.total_due_this_month || 0)

      if (fee.status === 'paid') {
        totals.paid.amount += paid
        totals.paid.count++
      }
      if (fee.status === 'unpaid') {
        totals.unpaid.amount += outstanding
        totals.unpaid.count++
      }
      if (fee.status === 'partial') {
        totals.partial.paidAmount += paid
        totals.partial.remainingBalance += outstanding
        totals.partial.count++
      }
      if (outstanding > 0) {
        totals.outstanding.amount += outstanding
        totals.outstanding.count++
      }
      if (fee.status === 'advanced') {
        totals.advanced.amount += paid
        totals.advanced.count++
      }
    })

    return totals
  }, [filteredFees])

  const handleSelectParent = (fee) => {
    setSelectedParent({
      id: fee.parent_id,
      parent_name: fee.parent_name,
      phone_number: fee.phone_number,
      number_of_children: fee.number_of_children,
      monthly_fee_amount: fee.parent_monthly_fee
    })
    setParentFee(fee)
    setSearchQuery('')
    // Auto-select advance payment if month is already paid
    if (fee.status === 'paid') {
      const monthlyFee = parseFloat(fee.parent_monthly_fee || 0)
      const calculatedAmount = (monthlyFee * 1).toFixed(2)
      setPaymentData({ amount: calculatedAmount, payment_type: 'advance', months_advance: 1, notes: '' })
    } else {
      setPaymentData({ amount: '', payment_type: 'normal', months_advance: 1, notes: '' })
    }
  }

  const clearSelection = () => {
    setSelectedParent(null)
    setParentFee(null)
    setPaymentData({ amount: '', payment_type: 'normal', months_advance: 1, notes: '' })
  }

  const handlePayment = async (e) => {
    e.preventDefault()
    if (!selectedParent || !selectedMonthId) {
      toast.error('Please select a parent and month')
      return
    }

    // Frontend validation
    const paymentAmount = parseFloat(paymentData.amount)
    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount')
      return
    }

    // STRICT VALIDATION: Check if month is already fully paid (only for normal/partial payments)
    if (parentFee && parentFee.status === 'paid' && paymentData.payment_type !== 'advance') {
      toast.error('This month is already fully paid. Please select Advance Payment to pay for future months.')
      return
    }

    // STRICT VALIDATION: For normal payments, check if amount exceeds monthly due
    if (paymentData.payment_type === 'normal' && parentFee) {
      const feePaid = parseFloat(parentFee.amount_paid_this_month || 0)
      const feeTotalDue = parseFloat(parentFee.total_due_this_month || 0)
      const remainingDue = feeTotalDue - feePaid

      if (paymentAmount > remainingDue) {
        toast.error(`Amount exceeds this month's payable fee. Select Advance Payment to pay extra. Maximum allowed: $${remainingDue.toFixed(2)}`)
        return
      }
    }

    // STRICT VALIDATION: For partial payments, amount must be less than remaining due
    if (paymentData.payment_type === 'partial' && parentFee) {
      const feePaid = parseFloat(parentFee.amount_paid_this_month || 0)
      const feeTotalDue = parseFloat(parentFee.total_due_this_month || 0)
      const remainingDue = feeTotalDue - feePaid

      if (paymentAmount >= remainingDue) {
        toast.error(`Partial payment amount must be less than the remaining due ($${remainingDue.toFixed(2)}). Use normal payment for full amount or Advance Payment for extra.`)
        return
      }
    }

    try {
      setLoading(true)
      const response = await api.post('/payments', {
        parent_id: selectedParent.id,
        billing_month_id: selectedMonthId,
        amount: paymentAmount,
        payment_type: paymentData.payment_type,
        months_advance: paymentData.payment_type === 'advance' ? parseInt(paymentData.months_advance) : null,
        notes: paymentData.notes
      })

      toast.success('Payment collected successfully!')
      setPaymentData({ amount: '', payment_type: 'normal', months_advance: 1, notes: '' })
      clearSelection()
      await fetchAllFees()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to collect payment')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-red-100 text-red-800',
      partial: 'bg-orange-100 text-orange-800',
      advanced: 'bg-blue-100 text-blue-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Collect Monthly Fee</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Process fee payments from parents</p>
      </div>

      {/* Month Selector */}
      <div className="card p-4 sm:p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
        <select
          value={selectedMonthId || ''}
          onChange={(e) => {
            const monthId = parseInt(e.target.value)
            setSelectedMonthId(monthId)
            const month = months.find(m => m.id === monthId)
            setSelectedMonth(month)
            clearSelection()
          }}
          className="input text-sm sm:text-base"
        >
          <option value="">Select a month</option>
          {months.map((month) => {
            if (!month || typeof month.year !== 'number' || typeof month.month !== 'number' || 
                isNaN(month.year) || isNaN(month.month) || month.year <= 0 || month.month < 1 || month.month > 12) {
              return null
            }
            const monthDate = new Date(month.year, month.month - 1)
            // Validate the date is valid
            if (isNaN(monthDate.getTime())) {
              return null
            }
            const monthName = monthDate.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric'
            })
            return (
              <option key={month.id} value={month.id}>
                {monthName}
                {month.is_active && ' (Active)'}
              </option>
            )
          })}
        </select>
      </div>

      {/* Filters and Search */}
      {selectedMonthId && (
        <div className="card p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 sm:pl-10 text-sm sm:text-base"
              />
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
                <option value="outstanding">Outstanding</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            {/* Branch Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="input w-full text-sm sm:text-base"
              >
                <option value="all">All Branches</option>
                <option value="Branch 1">Branch 1</option>
                <option value="Branch 2">Branch 2</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Live Totals Summary */}
      {selectedMonthId && (statusFilter !== 'all' || branchFilter !== 'all') && liveTotals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* General totals - always show */}
          <div className="card p-4 bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-600 font-medium mb-1">Total Amount Collected</p>
            <p className="text-2xl font-bold text-blue-700">
              ${filteredFees.reduce((sum, fee) => sum + parseFloat(fee.amount_paid_this_month || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card p-4 bg-red-50 border border-red-200">
            <p className="text-xs text-red-600 font-medium mb-1">Total Outstanding Amount</p>
            <p className="text-2xl font-bold text-red-700">
              ${filteredFees.reduce((sum, fee) => sum + parseFloat(fee.outstanding_after_payment || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card p-4 bg-gray-50 border border-gray-200">
            <p className="text-xs text-gray-600 font-medium mb-1">Number of Students</p>
            <p className="text-2xl font-bold text-gray-700">{filteredFees.length}</p>
          </div>
          {/* Status-specific totals - show when status filter is selected */}
          {statusFilter === 'paid' && liveTotals.paid.count > 0 && (
            <>
              <div className="card p-4 bg-green-50 border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">Total Paid Amount</p>
                <p className="text-2xl font-bold text-green-700">
                  ${liveTotals.paid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-green-50 border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">Number of Paid Students</p>
                <p className="text-2xl font-bold text-green-700">{liveTotals.paid.count}</p>
              </div>
            </>
          )}
          {statusFilter === 'unpaid' && (
            <>
              <div className="card p-4 bg-red-50 border border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">Total Outstanding Amount</p>
                <p className="text-2xl font-bold text-red-700">
                  ${liveTotals.unpaid.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-red-50 border border-red-200">
                <p className="text-xs text-red-600 font-medium mb-1">Number of Unpaid Students</p>
                <p className="text-2xl font-bold text-red-700">{liveTotals.unpaid.count}</p>
              </div>
            </>
          )}
          {statusFilter === 'partial' && (
            <>
              <div className="card p-4 bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-600 font-medium mb-1">Total Partial Paid Amount</p>
                <p className="text-2xl font-bold text-orange-700">
                  ${liveTotals.partial.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-600 font-medium mb-1">Total Remaining Balance</p>
                <p className="text-2xl font-bold text-orange-700">
                  ${liveTotals.partial.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-600 font-medium mb-1">Number of Partial Students</p>
                <p className="text-2xl font-bold text-orange-700">{liveTotals.partial.count}</p>
              </div>
            </>
          )}
          {statusFilter === 'outstanding' && (
            <>
              <div className="card p-4 bg-yellow-50 border border-yellow-200">
                <p className="text-xs text-yellow-600 font-medium mb-1">Total Outstanding Amount</p>
                <p className="text-2xl font-bold text-yellow-700">
                  ${liveTotals.outstanding.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-yellow-50 border border-yellow-200">
                <p className="text-xs text-yellow-600 font-medium mb-1">Number of Students with Outstanding</p>
                <p className="text-2xl font-bold text-yellow-700">{liveTotals.outstanding.count}</p>
              </div>
            </>
          )}
          {statusFilter === 'advanced' && (
            <>
              <div className="card p-4 bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Total Advance Paid Amount</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${liveTotals.advanced.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="card p-4 bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Number of Advanced Students</p>
                <p className="text-2xl font-bold text-blue-700">{liveTotals.advanced.count}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Parents List - Desktop Table View */}
      {selectedMonthId && (
        <div className="hidden lg:block card overflow-hidden p-0">
          <div className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Parents ({filteredFees.length})
              </h2>
              {selectedParent && (
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
                >
                  <XMarkIcon className="h-4 w-4 mr-1" />
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {loadingFees ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="text-center py-8 text-gray-500 px-4 sm:px-6">
              {searchQuery || statusFilter !== 'all' 
                ? 'No parents found matching your filters' 
                : 'No parents found for this month'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Parent Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Fee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFees.map((fee) => (
                    <tr 
                      key={fee.id} 
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedParent?.id === fee.parent_id ? 'bg-primary-50' : ''
                      }`}
                      onClick={() => handleSelectParent(fee)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {fee.parent_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {fee.phone_number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        ${parseFloat(fee.monthly_fee).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                        ${parseFloat(fee.total_due_this_month).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600">
                        ${parseFloat(fee.amount_paid_this_month).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600">
                        ${parseFloat(fee.outstanding_after_payment).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(fee.status)}`}>
                          {fee.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectParent(fee)
                          }}
                          className="text-primary-600 hover:text-primary-900 font-medium"
                        >
                          Collect
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

      {/* Parents List - Mobile Card View */}
      {selectedMonthId && (
        <div className="lg:hidden space-y-3">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Parents ({filteredFees.length})
            </h2>
            {selectedParent && (
              <button
                onClick={clearSelection}
                className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Clear
              </button>
            )}
          </div>

          {loadingFees ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredFees.length === 0 ? (
            <div className="card p-6 text-center text-gray-500">
              {searchQuery || statusFilter !== 'all' 
                ? 'No parents found matching your filters' 
                : 'No parents found for this month'}
            </div>
          ) : (
            filteredFees.map((fee) => (
              <div
                key={fee.id}
                onClick={() => handleSelectParent(fee)}
                className={`card p-4 cursor-pointer transition-all ${
                  selectedParent?.id === fee.parent_id 
                    ? 'bg-primary-50 border-2 border-primary-300 shadow-lg' 
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate mb-1">
                      {fee.parent_name}
                    </h3>
                    <p className="text-sm text-gray-600 break-all">{fee.phone_number}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${getStatusBadge(fee.status)}`}>
                    {fee.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-600">Monthly Fee</p>
                    <p className="font-semibold">${parseFloat(fee.monthly_fee).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Due</p>
                    <p className="font-bold text-gray-900">${parseFloat(fee.total_due_this_month).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Paid</p>
                    <p className="font-semibold text-green-600">${parseFloat(fee.amount_paid_this_month).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Outstanding</p>
                    <p className="font-bold text-red-600">${parseFloat(fee.outstanding_after_payment).toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSelectParent(fee)
                  }}
                  className="w-full btn btn-primary text-sm py-2"
                >
                  Collect Payment
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Parent Info & Payment Form - Modal Popup */}
      {selectedParent && parentFee && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={clearSelection}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Collect Payment</h2>
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Parent Information */}
                <div className="card p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Parent Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Parent Name</p>
                      <p className="text-base sm:text-lg font-semibold break-words">{selectedParent.parent_name}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Phone Number</p>
                      <p className="text-base sm:text-lg font-semibold break-all">{selectedParent.phone_number}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Number of Children</p>
                      <p className="text-base sm:text-lg font-semibold">{selectedParent.number_of_children}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Monthly Fee</p>
                      <p className="text-base sm:text-lg font-semibold">${parseFloat(selectedParent.monthly_fee_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Carried Forward</p>
                      <p className="text-base sm:text-lg font-semibold text-orange-600">
                        ${parseFloat(parentFee.carried_forward_amount || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Total Due</p>
                      <p className="text-xl sm:text-2xl font-bold text-primary-600">
                        ${parseFloat(parentFee.total_due_this_month || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Status</p>
                      <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-semibold inline-block mt-1 ${
                        parentFee.status === 'paid' ? 'bg-green-100 text-green-800' :
                        parentFee.status === 'partial' ? 'bg-orange-100 text-orange-800' :
                        parentFee.status === 'advanced' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {parentFee.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Form */}
                <div className="card p-4 sm:p-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Payment Details</h3>
                  <form onSubmit={handlePayment} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                      <select
                        value={paymentData.payment_type}
                        onChange={(e) => {
                          const newType = e.target.value
                          let newAmount = ''
                          // Auto-calculate amount for advance payments
                          if (newType === 'advance' && selectedParent) {
                            const monthlyFee = parseFloat(selectedParent.monthly_fee_amount || 0)
                            const months = parseInt(paymentData.months_advance || 1)
                            newAmount = (monthlyFee * months).toFixed(2)
                          }
                          setPaymentData({ ...paymentData, payment_type: newType, amount: newAmount })
                        }}
                        className="input text-sm sm:text-base"
                      >
                        {parentFee?.status !== 'paid' && (
                          <>
                            <option value="normal">Pay Current Month</option>
                            <option value="partial">Partial Payment</option>
                          </>
                        )}
                        <option value="advance">Advance Payment</option>
                      </select>
                      {parentFee?.status === 'paid' && (
                        <p className="text-xs text-blue-600 mt-1">This month is already fully paid. You can make an Advance Payment for future months.</p>
                      )}
                    </div>

                    {paymentData.payment_type === 'advance' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Months in Advance</label>
                        <input
                          type="number"
                          min="1"
                          value={paymentData.months_advance}
                          onChange={(e) => {
                            const months = parseInt(e.target.value) || 1
                            const monthlyFee = parseFloat(selectedParent?.monthly_fee_amount || 0)
                            const calculatedAmount = (monthlyFee * months).toFixed(2)
                            setPaymentData({ 
                              ...paymentData, 
                              months_advance: months,
                              amount: calculatedAmount
                            })
                          }}
                          className="input text-sm sm:text-base"
                        />
                        {selectedParent && (
                          <p className="text-xs text-gray-500 mt-1">
                            Monthly Fee: ${parseFloat(selectedParent.monthly_fee_amount).toFixed(2)} × {paymentData.months_advance} month(s) = ${(parseFloat(selectedParent.monthly_fee_amount) * parseInt(paymentData.months_advance || 1)).toFixed(2)}
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                      <div className="relative">
                        <CurrencyDollarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        <input
                          type="number"
                          step="0.01"
                          required
                          min="0.01"
                          max={paymentData.payment_type === 'advance' ? undefined : (() => {
                            if (!parentFee) return undefined
                            const feePaid = parseFloat(parentFee.amount_paid_this_month || 0)
                            const feeTotalDue = parseFloat(parentFee.total_due_this_month || 0)
                            return feeTotalDue - feePaid
                          })()}
                          value={paymentData.amount}
                          onChange={(e) => {
                            const value = e.target.value
                            setPaymentData({ ...paymentData, amount: value })
                          }}
                          className="input pl-9 sm:pl-10 text-sm sm:text-base"
                          placeholder="Enter amount"
                        />
                      </div>
                      {paymentData.payment_type === 'advance' && (
                        <p className="text-xs text-blue-600 mt-1">
                          Enter the total amount you want to pay in advance. This will be applied to future months.
                        </p>
                      )}
                      {paymentData.payment_type !== 'advance' && parentFee && (
                        <p className="text-xs text-gray-500 mt-1">
                          {(() => {
                            const feePaid = parseFloat(parentFee.amount_paid_this_month || 0)
                            const feeTotalDue = parseFloat(parentFee.total_due_this_month || 0)
                            const remainingDue = feeTotalDue - feePaid
                            if (paymentData.payment_type === 'partial') {
                              return `Maximum for partial: $${remainingDue.toFixed(2)} (must be less than remaining due)`
                            }
                            return `Maximum: $${remainingDue.toFixed(2)} (remaining due this month)`
                          })()}
                        </p>
                      )}
                      {paymentData.payment_type === 'partial' && parentFee && parseFloat(paymentData.amount || 0) >= (() => {
                        const feePaid = parseFloat(parentFee.amount_paid_this_month || 0)
                        const feeTotalDue = parseFloat(parentFee.total_due_this_month || 0)
                        return feeTotalDue - feePaid
                      })() && (
                        <p className="text-xs text-red-600 mt-1">
                          Partial payment must be less than remaining due. Use normal payment for full amount.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                      <textarea
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                        className="input text-sm sm:text-base"
                        rows="3"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="flex-1 btn btn-outline py-2.5 sm:py-3 text-sm sm:text-base"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 btn btn-primary py-2.5 sm:py-3 disabled:opacity-50 text-sm sm:text-base"
                      >
                        {loading ? 'Processing...' : 'Collect Payment'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

