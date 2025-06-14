import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      await axios.get(`http://localhost:5000/api/auth/verify-email/${token}`);
      toast.success('Email verified successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Error verifying email');
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="form-container">
        <h2 className="form-title">Verifying your email...</h2>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2 className="form-title">Email Verification Failed</h2>
      <p style={{ textAlign: 'center' }}>
        The verification link is invalid or has expired. Please try registering again.
      </p>
    </div>
  );
};

export default VerifyEmail; 