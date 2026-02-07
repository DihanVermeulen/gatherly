export const Container = ({ children }) => {
  return (
    <div className="flex flex-col bg-gradient-to-br from-red-50 via-white to-green-50">
      {children}
    </div>
  );
};
