import { useState } from "react";

interface Props {
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmText = "确认删除", onConfirm, onCancel }: Props) {
  const [closing, setClosing] = useState(false);

  // 退出动画：先标记 closing 触发 CSS 退场动画，等待动画结束后再执行回调真正卸载
  function requestClose(callback: () => void) {
    if (closing) return;
    setClosing(true);
    window.setTimeout(callback, 180);
  }

  return (
    <div
      className={`modal-overlay${closing ? " closing" : ""}`}
      onClick={() => requestClose(onCancel)}
    >
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-message">{message}</div>
        <div className="confirm-actions">
          <button className="btn secondary" onClick={() => requestClose(onCancel)}>
            取消
          </button>
          <button className="btn danger-solid" onClick={() => requestClose(onConfirm)}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
