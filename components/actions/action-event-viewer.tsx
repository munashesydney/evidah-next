'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface ActionEvent {
  id: string;
  actionId: string;
  triggerData: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  messagesSaved?: number;
  error?: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  toolCalls?: any[];
}

interface ActionEventViewerProps {
  uid: string;
  selectedCompany: string;
  actionId: string;
  actionName: string;
  employeeId: string;
  onClose: () => void;
}

const employees = [
  { id: 'emma', name: 'Emma', avatar: '/images/characters/emma.png', gradient: 'from-pink-500 to-pink-700' },
  { id: 'marquavious', name: 'Marquavious', avatar: '/images/characters/mq.png', gradient: 'from-blue-500 to-blue-700' },
  { id: 'sung-wen', name: 'Sung Wen', avatar: '/images/characters/sw.png', gradient: 'from-emerald-500 to-emerald-700' },
  { id: 'charlie', name: 'Charlie', avatar: '/images/characters/charlie.png', gradient: 'from-amber-500 to-orange-600' },
];

export default function ActionEventViewer({
  uid,
  selectedCompany,
  actionId,
  actionName,
  employeeId,
  onClose,
}: ActionEventViewerProps) {
  const [events, setEvents] = useState<ActionEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ActionEvent | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const employee = employees.find((e) => e.id === employeeId);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchMessages(selectedEvent.id);
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const response = await fetch(
        `/api/actions/events?uid=${uid}&selectedCompany=${selectedCompany}&actionId=${actionId}`
      );
      const data = await response.json();

      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchMessages = async (eventId: string) => {
    try {
      setLoadingMessages(true);
      const response = await fetch(
        `/api/actions/events/${eventId}/messages?uid=${uid}&selectedCompany=${selectedCompany}&actionId=${actionId}`
      );
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'processing':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            {employee && (
              <div className={`w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br ${employee.gradient}`}>
                <Image
                  src={employee.avatar}
                  alt={employee.name}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{actionName}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Action Events</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Events List */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Event History ({events.length})
              </h3>
              {loadingEvents ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  No events yet
                </div>
              ) : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedEvent?.id === event.id
                          ? 'bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(event.createdAt)}
                        </span>
                      </div>
                      {event.triggerData?.ticketSubject && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {event.triggerData.ticketSubject}
                        </p>
                      )}
                      {event.messagesSaved && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {event.messagesSaved} messages
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Messages View */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedEvent ? (
              <>
                {/* Event Details */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(selectedEvent.status)}`}>
                      {selectedEvent.status}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(selectedEvent.createdAt)}
                    </span>
                  </div>
                  {selectedEvent.triggerData && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                      <p><strong>Ticket:</strong> {selectedEvent.triggerData.ticketSubject || 'N/A'}</p>
                      <p><strong>From:</strong> {selectedEvent.triggerData.ticketFrom || 'N/A'}</p>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {loadingMessages ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No messages yet
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.role === 'user'
                              ? 'bg-violet-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          {message.toolCalls && message.toolCalls.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/20 dark:border-gray-600">
                              <p className="text-xs opacity-75 mb-1">Tools used:</p>
                              <div className="flex flex-wrap gap-1">
                                {message.toolCalls.map((tool, idx) => (
                                  <span
                                    key={idx}
                                    className="text-xs px-2 py-1 rounded bg-white/20 dark:bg-gray-600"
                                  >
                                    {tool.name || tool.type}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                Select an event to view messages
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
