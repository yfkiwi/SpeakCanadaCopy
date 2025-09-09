const WordLookupEnabled = ({ children, className = "" }) => {
  return (
    <div 
      data-word-lookup="enabled" 
      className={`select-text ${className}`}
    >
      {children}
    </div>
  );
};

export default WordLookupEnabled;


