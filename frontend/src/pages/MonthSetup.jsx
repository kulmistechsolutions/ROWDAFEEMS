import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useSocket } from '../contexts/SocketContext'
import { CalendarIcon, PlayIcon } from '@heroicons/react/24/outline'

export default function MonthSetup() {
  const [months, setMonths] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [loading, setLoading] = useState(false)
  const { socket } = useSocket()

  useEffect(() => {
    fetchMonths()
  }, [])

  // Listen for real-time month updates
  useEffect(() => {
    if (!socket) return

    const handleMonthCreated = (data) => {
      fetchMonths()
      toast.success('New month created in real-time!', { icon: '📅' })
    }

    socket.on('month:created', handleMonthCreated)

    return () => {
      socket.off('month:created', handleMonthCreated)
    }
  }, [socket])

  const fetchMonths = async () => {
    try {
      const response = await api.get('/months')
      setMonths(response.data)
    } catch (error) {
      toast.error('Failed to fetch months')
    }
  }

  const handleSetup = async () => {
    if (!selectedYear || !selectedMonth) {
      toast.error('Please select year and month')
      return
    }

    // Check if month already exists
    const exists = months.find(
      m => m.year === selectedYear && m.month === selectedMonth
    )

    if (exists) {
      if (!confirm('This month already exists. Do you want to continue?')) {
        return
      }
    }

    try {
      setLoading(true)
      const response = await api.post('/months/setup', {
        year: selectedYear,
        month: selectedMonth
      })
      toast.success('Month setup completed successfully!')
      fetchMonths()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to setup month')
    } finally {
      setLoading(false)
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="w-full max-w-full space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Month Setup</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">Create new billing months and initialize fee records</p>
      </div>

      <div className="card max-w-2xl p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Start New Billing Month</h2>

        <div className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Year
            </label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => {
                const year = e.target.value ? parseInt(e.target.value) : new Date().getFullYear()
                // Validate year is between 2000 and 2100
                if (year >= 2000 && year <= 2100) {
                  setSelectedYear(year)
                } else if (e.target.value === '') {
                  setSelectedYear(new Date().getFullYear())
                }
              }}
              min="2000"
              max="2100"
              placeholder="Enter year (e.g., 2025)"
              className="input text-sm sm:text-base w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="input text-sm sm:text-base w-full"
            >
              {monthNames.map((name, index) => (
                <option key={index + 1} value={index + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base">What happens when you start a new month?</h3>
            <ul className="text-xs sm:text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>All previous months will be deactivated</li>
              <li>Unpaid amounts from previous months will be carried forward</li>
              <li>Partial payments will have their remaining balance carried forward</li>
              <li>Advance payments will be applied to cover the new month</li>
              <li>New fee records will be created for all parents</li>
            </ul>
          </div>

          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full btn btn-primary py-2.5 sm:py-3 disabled:opacity-50 flex items-center justify-center text-sm sm:text-base"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                Setting up...
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Start New Month
              </>
            )}
          </button>
        </div>
      </div>

      {/* Existing Months - Desktop Table View */}
      <div className="hidden lg:block card overflow-hidden p-0">
        <div className="p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Existing Billing Months</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {months.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No billing months created yet. Start a new month to begin.
                  </td>
                </tr>
              ) : (
                months.map((month) => (
                  <tr key={month.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{month.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {monthNames[month.month - 1]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        month.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {month.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(month.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Existing Months - Mobile Card View */}
      <div className="lg:hidden space-y-3">
        <h2 className="text-lg font-bold text-gray-900 px-2">Existing Billing Months</h2>
        {months.length === 0 ? (
          <div className="card p-6 text-center text-gray-500">
            No billing months created yet. Start a new month to begin.
          </div>
        ) : (
          months.map((month) => (
            <div key={month.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-gray-900">
                      {monthNames[month.month - 1]} {month.year}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(month.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                  month.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {month.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

