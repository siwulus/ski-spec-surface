import { toast } from "sonner";

export default function ToastTest() {
  const handleSuccess = () => {
    toast.success("Success!", { description: "This is a success message" });
  };

  const handleError = () => {
    toast.error("Error!", { description: "This is an error message" });
  };

  const handleInfo = () => {
    toast.info("Info", { description: "This is an info message" });
  };

  const handleWarning = () => {
    toast.warning("Warning", { description: "This is a warning message" });
  };

  return (
    <div className="space-x-4">
      <button onClick={handleSuccess} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
        Test Success Toast
      </button>
      <button onClick={handleError} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
        Test Error Toast
      </button>
      <button onClick={handleInfo} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Test Info Toast
      </button>
      <button onClick={handleWarning} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
        Test Warning Toast
      </button>
    </div>
  );
}
