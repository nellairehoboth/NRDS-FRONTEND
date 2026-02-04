import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import Toast from './Toast';
import './Toast.css';

const ToastContainer = () => {
    const { toasts, removeToast } = useToast();

    return (
        <div className="toast-container">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <Toast key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
