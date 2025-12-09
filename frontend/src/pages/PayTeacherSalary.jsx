import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useSocket } from '../contexts/SocketContext'
import { MagnifyingGlassIcon, CurrencyDollarIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function PayTeacherSalary() {
  const [months, setMonths] = useState([])
  const [selectedMonthId, setSelectedMonthId] = useState(null)
  const [salaryRecords, setSalaryRecords] = useState([])
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
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
    if (selectedMonthId) {
      fetchSalaryRecords()
    }
  }, [selectedMonthId])

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
      const response = await api.get(`/teachers/salary/month/${selectedMonthId}`)
      setSalaryRecords(response.data)
    } catch (error) {
      toast.error('Failed to fetch salary records')
    } finally {
      setLoading(false)
    }
  }

  const handlePayClick = (teacher) => {
    setSelectedTeacher(teacher)
    setPaymentData({
      amount: teacher.outstanding_after_payment > 0 ? teacher.outstanding_after_payment : teacher.total_due_this_month,
      payment_type: 'normal',
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
      outstanding: 'bg-yellow-100 text-yellow-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const selectedMonth = months.find(m => m.id === selectedMonthId)

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pay Teacher Salary</h1>
        <p className="text-sm text-gray-500 mt-1">Process monthly salary payments for teachers</p>
      </div>

      {/* Month Selection */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
        <select
          value={selectedMonthId || ''}
          onChange={(e) => setSelectedMonthId(parseInt(e.target.value))}
          className="input"
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

      {/* Salary Records Table */}
      {selectedMonthId && (
        <div className="card overflow-hidden p-0">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                        {record.outstanding_after_payment > 0 && (
                          <button
                            onClick={() => handlePayClick(record)}
                            className="btn btn-primary text-sm"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Pay Salary</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Teacher: <span className="font-semibold">{selectedTeacher.teacher_name}</span></p>
              <p className="text-sm text-gray-600">Outstanding: <span className="font-semibold text-red-600">${parseFloat(selectedTeacher.outstanding_after_payment || 0).toLocaleString()}</span></p>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                <select
                  className="input"
                  value={paymentData.payment_type}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_type: e.target.value })}
                >
                  <option value="normal">Full Payment</option>
                  <option value="partial">Partial Payment</option>
                  <option value="advance">Advance Payment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="input"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                />
              </div>
              {paymentData.payment_type === 'advance' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Months in Advance</label>
                  <input
                    type="number"
                    min="1"
                    required
                    className="input"
                    value={paymentData.months_advance}
                    onChange={(e) => setPaymentData({ ...paymentData, months_advance: parseInt(e.target.value) })}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  className="input"
                  rows="3"
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 btn btn-primary" disabled={loading}>
                  {loading ? 'Processing...' : 'Process Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 btn btn-outline"
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

