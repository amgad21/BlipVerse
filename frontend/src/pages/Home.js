import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InfiniteScroll from 'react-infinite-scroll-component';
import EmojiPicker from 'emoji-picker-react';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';
import { toast } from 'react-toastify';

const Home = () => {
  const [blips, setBlips] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newBlip, setNewBlip] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { messages } = useWebSocket();

  useEffect(() => {
    fetchBlips();
  }, []);

  useEffect(() => {
    messages.forEach(message => {
      if (message.type === 'NEW_BLIP') {
        setBlips(prev => [message.blip, ...prev]);
      } else if (message.type === 'REACTION_UPDATE') {
        setBlips(prev => prev.map(blip => {
          if (blip.id === message.blipId) {
            return {
              ...blip,
              reactions: {
                ...blip.reactions,
                [message.reactionType]: (blip.reactions[message.reactionType] || 0) + 1
              }
            };
          }
          return blip;
        }));
      }
    });
  }, [messages]);

  const fetchBlips = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/blips?page=${page}`);
      const newBlips = response.data;
      
      if (newBlips.length === 0) {
        setHasMore(false);
      } else {
        setBlips(prev => [...prev, ...newBlips]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      toast.error('Failed to load blips');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newBlip.trim()) return;

    try {
      const response = await axios.post(
        'http://localhost:5000/api/blips',
        { content: newBlip },
        { withCredentials: true }
      );
      setBlips(prev => [response.data, ...prev]);
      setNewBlip('');
      toast.success('Blip posted!');
    } catch (error) {
      toast.error('Failed to post blip');
    }
  };

  const handleReaction = async (blipId, reactionType) => {
    try {
      await axios.post(
        `http://localhost:5000/api/blips/${blipId}/reactions`,
        { reactionType },
        { withCredentials: true }
      );
      setBlips(blips.map(blip => 
        blip.id === blipId 
          ? { ...blip, reaction_count: (blip.reaction_count || 0) + 1 }
          : blip
      ));
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  const handleReport = async (blipId) => {
    try {
      await axios.post(
        'http://localhost:5000/api/reports',
        { reportedBlipId: blipId, reason: 'Inappropriate content' },
        { withCredentials: true }
      );
      toast.success('Blip reported');
    } catch (error) {
      toast.error('Failed to report blip');
    }
  };

  const onEmojiClick = (emojiObject) => {
    setNewBlip(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="home">
      {isAuthenticated && (
        <form onSubmit={handleSubmit} className="blip-form">
          <textarea
            value={newBlip}
            onChange={(e) => setNewBlip(e.target.value)}
            placeholder="What's on your mind?"
            maxLength={280}
            className="blip-input"
          />
          <div className="blip-form-actions">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="emoji-button"
            >
              😊
            </button>
            <button type="submit" className="submit-button">
              Post
            </button>
          </div>
          {showEmojiPicker && (
            <div className="emoji-picker-container">
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </div>
          )}
        </form>
      )}

      <InfiniteScroll
        dataLength={blips.length}
        next={fetchBlips}
        hasMore={hasMore}
        loader={<h4>Loading...</h4>}
        endMessage={
          <p style={{ textAlign: 'center' }}>
            <b>No more blips to load</b>
          </p>
        }
      >
        {blips.map((blip) => (
          <div key={blip.id} className="blip-card">
            <div className="blip-header">
              <img src={blip.avatar_url} alt={blip.username} className="avatar" />
              <span className="username">{blip.username}</span>
              <span className="timestamp">
                {new Date(blip.created_at).toLocaleString()}
              </span>
            </div>
            <p className="blip-content">{blip.content}</p>
            <div className="blip-actions">
              <button
                onClick={() => handleReaction(blip.id, 'like')}
                className="reaction-button"
              >
                ❤️ {blip.reaction_count || 0}
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => handleReport(blip.id)}
                  className="report-button"
                >
                  Report
                </button>
              )}
            </div>
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
};

export default Home; 