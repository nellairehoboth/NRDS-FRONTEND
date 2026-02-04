import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const ConfirmContext = createContext();

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        resolve: null
    });

    const showConfirm = useCallback((title, message) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                resolve
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (confirmState.resolve) confirmState.resolve(true);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, [confirmState]);

    const handleCancel = useCallback(() => {
        if (confirmState.resolve) confirmState.resolve(false);
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    }, [confirmState]);

    return (
        <ConfirmContext.Provider value={showConfirm}>
            {children}
            <ConfirmModal
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
            />
        </ConfirmContext.Provider>
    );
};
