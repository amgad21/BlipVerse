import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AdminDashboard = () => {
  // keep track of reports, users, and which tab we're on
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('reports');

  // load reports or users when tab changes
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    } else {
      fetchUsers();
    }
  }, [activeTab]);

  // get all reports from the server
  const fetchReports = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/reports', {
        withCredentials: true
      });
      setReports(response.data);
    } catch (error) {
      toast.error('Failed to load reports');
    }
  };

  // get all users from the server
  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        withCredentials: true
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  // handle resolving a report
  const handleResolve = async (reportId, action, userId, blipId) => {
    try {
      await axios.post(
        `http://localhost:5000/api/admin/reports/${reportId}/resolve`,
        { action, userId, blipId },
        { withCredentials: true }
      );
      toast.success('Report handled');
      fetchReports();
    } catch (error) {
      toast.error('Failed to handle report');
    }
  };

  // handle banning/unbanning/deleting users
  const handleUserAction = async (userId, action) => {
    try {
      await axios.post(
        `http://localhost:5000/api/admin/users/${userId}/${action}`,
        {},
        { withCredentials: true }
      );
      toast.success(`User ${action}ed`);
      fetchUsers();
    } catch (error) {
      toast.error(`Failed to ${action} user`);
    }
  };

  return (
    <div className="admin-dashboard">
      <h2 className="admin-title">Admin Dashboard</h2>
      
      {/* tabs to switch between reports and users */}
      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
      </div>

      {/* show reports or users based on active tab */}
      {activeTab === 'reports' ? (
        <div className="reports-list">
          {reports.map((report) => (
            <div key={report.id} className="report-card">
              <div className="report-header">
                <div>
                  <p>
                    <strong>Reporter:</strong> {report.reporter_username}
                  </p>
                  <p>
                    <strong>Reason:</strong> {report.reason}
                  </p>
                  {report.reported_username && (
                    <p>
                      <strong>Reported User:</strong> {report.reported_username}
                    </p>
                  )}
                  {report.reported_blip_content && (
                    <p>
                      <strong>Reported Content:</strong> {report.reported_blip_content}
                    </p>
                  )}
                </div>
                <div className="report-actions">
                  {report.reported_user_id && (
                    <button
                      onClick={() =>
                        handleResolve(report.id, 'ban', report.reported_user_id)
                      }
                      className="report-button ban"
                    >
                      Ban User
                    </button>
                  )}
                  {report.reported_blip_id && (
                    <button
                      onClick={() =>
                        handleResolve(report.id, 'delete', null, report.reported_blip_id)
                      }
                      className="report-button delete"
                    >
                      Delete Blip
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(report.id, 'dismiss')}
                    className="report-button"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="users-list">
          {users.map((user) => (
            <div key={user.id} className="user-card">
              <div className="user-info">
                <img src={user.avatar_url} alt={user.username} className="user-avatar" />
                <div>
                  <h3>{user.username}</h3>
                  <p>{user.email}</p>
                  <p>Status: {user.is_banned ? 'Banned' : 'Active'}</p>
                </div>
              </div>
              <div className="user-actions">
                {user.is_banned ? (
                  <button
                    onClick={() => handleUserAction(user.id, 'unban')}
                    className="user-button unban"
                  >
                    Unban User
                  </button>
                ) : (
                  <button
                    onClick={() => handleUserAction(user.id, 'ban')}
                    className="user-button ban"
                  >
                    Ban User
                  </button>
                )}
                <button
                  onClick={() => handleUserAction(user.id, 'delete')}
                  className="user-button delete"
                >
                  Delete User
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard; 