import "./ProductionConsole.css";

interface ProductionConsoleProps {
  messages: string[];
  onClear: () => void;
}

function ProductionConsoleView({ messages, onClear }: ProductionConsoleProps) {
  if (messages.length === 0) return null;

  return (
    <div className="production-console">
      <div className="production-console-header">
        <span className="production-console-title">Production Console</span>
        <button className="secondary production-console-clear-btn" onClick={onClear}>
          Clear
        </button>
      </div>
      <ol className="production-console-log">
        {messages.map((message, index) => (
          <li key={index} className={`production-console-entry${index === messages.length - 1 ? " production-console-entry--latest" : ""}`}>
            {message}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default ProductionConsoleView;
