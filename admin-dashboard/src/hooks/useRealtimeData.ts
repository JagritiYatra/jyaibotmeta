import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface RealtimeConfig {
  endpoint: string;
  events: string[];
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export const useRealtimeData = (config: RealtimeConfig) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socketInstance = io(config.endpoint, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      toast.success('Real-time connection established', {
        icon: '🔌',
        duration: 2000,
      });
      config.onConnect?.();
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      toast.error('Real-time connection lost', {
        icon: '🔌',
        duration: 2000,
      });
      config.onDisconnect?.();
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
      config.onError?.(error);
    });

    // Register event listeners
    config.events.forEach(event => {
      socketInstance.on(event, (data) => {
        setLastUpdate(new Date());
        
        // Invalidate relevant queries based on event type
        switch (event) {
          case 'user:update':
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['user', data.userId] });
            break;
          case 'session:new':
          case 'session:update':
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            break;
          case 'message:new':
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            break;
          case 'analytics:update':
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            break;
          default:
            queryClient.invalidateQueries();
        }
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [config.endpoint]);

  const emit = useCallback((event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    lastUpdate,
    emit,
  };
};

export const useRealtimeMetrics = () => {
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    messagesPerMinute: 0,
    apiLatency: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    dbConnections: 0,
  });

  const config: RealtimeConfig = {
    endpoint: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3000',
    events: ['metrics:update', 'metrics:alert'],
  };

  const { socket, isConnected } = useRealtimeData(config);

  useEffect(() => {
    if (socket) {
      socket.on('metrics:update', (data) => {
        setMetrics(data);
      });

      socket.on('metrics:alert', (alert) => {
        toast.error(`System Alert: ${alert.message}`, {
          duration: 5000,
          icon: '⚠️',
        });
      });
    }
  }, [socket]);

  return { metrics, isConnected };
};

export const useRealtimeNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  const config: RealtimeConfig = {
    endpoint: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3000',
    events: ['notification:new', 'notification:update'],
  };

  const { socket, isConnected } = useRealtimeData(config);

  useEffect(() => {
    if (socket) {
      socket.on('notification:new', (notification) => {
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        
        // Show toast for important notifications
        if (notification.priority === 'high') {
          toast(notification.message, {
            icon: notification.icon || '📢',
            duration: 4000,
          });
        }
      });
    }
  }, [socket]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, clearNotifications, isConnected };
};