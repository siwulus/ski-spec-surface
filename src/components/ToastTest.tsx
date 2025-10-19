import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const ToastTest: React.FC = () => {
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
    <div className="flex flex-wrap gap-4" role="region" aria-label="Toast notification test controls">
      <Button onClick={handleSuccess} variant="default" type="button">
        Test Success Toast
      </Button>
      <Button onClick={handleError} variant="destructive" type="button">
        Test Error Toast
      </Button>
      <Button onClick={handleInfo} variant="secondary" type="button">
        Test Info Toast
      </Button>
      <Button onClick={handleWarning} variant="outline" type="button">
        Test Warning Toast
      </Button>
    </div>
  );
};

export default ToastTest;
