import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning', // 'warning', 'danger', 'info', 'success'
    isLoading = false
}) => {
    if (!isOpen) return null;

    const icons = {
        warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
        danger: <AlertCircle className="w-6 h-6 text-red-500" />,
        info: <Info className="w-6 h-6 text-blue-500" />,
        success: <CheckCircle className="w-6 h-6 text-green-500" />
    };

    const buttonColors = {
        warning: 'bg-yellow-600 hover:bg-yellow-700',
        danger: 'bg-red-600 hover:bg-red-700',
        info: 'bg-blue-600 hover:bg-blue-700',
        success: 'bg-green-600 hover:bg-green-700'
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                >
                    <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${type === 'danger' ? 'bg-red-50' : type === 'warning' ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                                    {icons[type]}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-gray-600 mb-8">
                            {message}
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                {cancelText}
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={isLoading}
                                className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-black/5 flex items-center justify-center gap-2 disabled:opacity-50 ${buttonColors[type]}`}
                            >
                                {isLoading && (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                )}
                                {confirmText}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ConfirmModal;
