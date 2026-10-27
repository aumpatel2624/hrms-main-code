import { useState, useEffect, useCallback } from 'react';
import { LOGIN } from '@demo-panel/shared/auth';

/**
 * Custom hook for managing login attempt status
 * Handles the lock countdown timer, fed from the login response — the
 * status-by-email endpoint is admin-only (ADR-047), so the form no longer
 * asks for an account's status before signing in.
 * @returns {Object} Login attempt status and formatted time
 */
export const useLoginAttempt = () => {
    const [status, setStatus] = useState({
        attemptCount: 0,
        isLocked: false,
        lockUntil: null,
        remainingTime: null,
        attemptsRemaining: LOGIN.MAX_ATTEMPTS,
    });
    const [formattedTime, setFormattedTime] = useState('');

    // Countdown timer effect - starts when remainingTime changes and is > 0
    useEffect(() => {
        if (!status.remainingTime || status.remainingTime <= 0) {
            setFormattedTime('');
            return;
        }

        const interval = setInterval(() => {
            setStatus(prev => {
                const newRemaining = prev.remainingTime - 1000;
                if (newRemaining <= 0) {
                    clearInterval(interval);
                    return {
                        ...prev,
                        remainingTime: 0,
                        isLocked: false,
                    };
                }
                return { ...prev, remainingTime: newRemaining };
            });
        }, 1000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status.isLocked, status.remainingTime > 0]);

    // Format time to HH:MM:SS
    useEffect(() => {
        if (status.remainingTime && status.remainingTime > 0) {
            const totalSeconds = Math.floor(status.remainingTime / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const formatted = `${hours.toString().padStart(2, '0')}:${minutes
                .toString()
                .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            setFormattedTime(formatted);
        } else {
            setFormattedTime('');
        }
    }, [status.remainingTime]);

    // Function to update status from login response
    const updateFromResponse = useCallback((responseData) => {
        if (responseData.attemptsRemaining !== undefined) {
            setStatus(prev => ({
                ...prev,
                attemptCount: LOGIN.MAX_ATTEMPTS - responseData.attemptsRemaining,
                attemptsRemaining: responseData.attemptsRemaining,
            }));
        }
        if (responseData.lockedUntil || responseData.remainingTimeMs) {
            setStatus(prev => ({
                ...prev,
                isLocked: true,
                lockUntil: responseData.lockedUntil,
                remainingTime: responseData.remainingTimeMs,
            }));
        }
    }, []);

    return {
        ...status,
        formattedTime,
        updateFromResponse,
    };
};

export default useLoginAttempt;
