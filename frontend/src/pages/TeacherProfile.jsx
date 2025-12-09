import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function TeacherProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [teacher, setTeacher] = useState(null)
  const [salaryHistory, setSalaryHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTeacher()
    fetchSalaryHistory()
  }, [id])

  const fetchTeacher = async () => {
    try {
      const response = await api.get(`/teachers/${id}`)
      setTeacher(response.data)
    } catch (error) {
      toast.error('Failed to fetch teacher')
      navigate('/teachers')
    } finally {
      setLoading(false)
    }
  }

  const fetchSalaryHistory = async () => {
    try {
      const response = await api.get(`/teachers/${id}/salary-history`)
      setSalaryHistory(response.data)
    } catch (error) {
      toast.error('Failed to fetch salary history')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!teacher) return null

  return (
    <div className="w-full space-y-6">
      <button onClick={() => navigate('/teachers')} className="flex items-center text-gray-600 hover:text-gray-900">
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        Back to Teachers
      </button>

      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{teacher.teacher_name}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-sm text-gray-600">Department</p>
            <p className="text-lg font-semibold">{teacher.department}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Monthly Salary</p>
            <p className="text-lg font-semibold">${parseFloat(teacher.monthly_salary).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Phone</p>
            <p className="text-lg font-semibold">{teacher.phone_number || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date Joined</p>
            <p className="text-lg font-semibold">{new Date(teacher.date_of_joining).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Salary History</h2>
        {salaryHistory.length === 0 ? (
          <p className="text-gray-500">No salary history found</p>
        ) : (
          <div className="space-y-4">
            {salaryHistory.map((record) => (
              <div key={record.id} className="border-l-4 border-primary-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {new Date(record.year, record.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>Salary: ${parseFloat(record.monthly_salary).toLocaleString()}</p>
                      <p>Paid: <span className="text-green-600">${parseFloat(record.amount_paid_this_month || 0).toLocaleString()}</span></p>
                      <p>Outstanding: <span className="text-red-600">${parseFloat(record.outstanding_after_payment || 0).toLocaleString()}</span></p>
                      {record.advance_balance_used > 0 && (
                        <p className="text-blue-600">Advance Used: ${parseFloat(record.advance_balance_used).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(record.status)}`}>
                    {record.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

