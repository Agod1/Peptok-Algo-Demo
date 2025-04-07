import { FC } from "react";

interface DialogBoxProps {
  isVisible: boolean;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DialogBox: FC<DialogBoxProps> = ({ isVisible, message, onClose, onConfirm }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/80 border border-[#CDE6FB] backdrop-blur-lg p-6 rounded-xl shadow-lg max-w-sm w-full">
        <p className="text-md font-medium text-[#0336D0] mb-4">
          You've not engaged 24 hours after your match. Would you like to send a message?
        </p>
        <p className="text-sm italic text-[#0336D0]/70 mb-6">"{message}"</p>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 text-[#0336D0] border border-[#0336D0] rounded-md hover:bg-[#0336D0]/10 transition"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="px-4 py-2 bg-[#0336D0] text-white rounded-md hover:bg-[#022ca7] transition"
            onClick={onConfirm}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default DialogBox;
