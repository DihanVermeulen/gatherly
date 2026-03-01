import { Container } from "components";
import { Gift, Lock } from "lucide-react";
import { useState } from "react";

export const DecipherPage = () => {
  const [codeToDecipher, setCodeToDecipher] = useState("");
  const [decipheredResult, setDecipheredResult] = useState(null);

  const decipherCode = () => {
    try {
      const decoded = atob(codeToDecipher);
      const [person, receivers] = decoded.split(":");
      setDecipheredResult({
        person,
        receivers: receivers.split(",").filter((r) => r),
      });
    } catch {
      setDecipheredResult({ error: "Invalid code" });
    }
  };

  return (
    <Container>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-red-100 p-8">
          <h2 className="text-2xl font-bold text-primary mb-6 text-center">
            <Lock /> Decipher Your Code
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Paste your secret code below to reveal who you're buying gifts for
          </p>

          <div className="space-y-4">
            <textarea
              placeholder="Paste your secret code here..."
              value={codeToDecipher}
              onChange={(e) => setCodeToDecipher(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && e.ctrlKey && decipherCode()
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary/90 font-mono text-sm h-24 resize-none"
            />
            <button
              onClick={decipherCode}
              className="w-full bg-primary-500 text-on-primary-0 py-3 rounded-lg transition-colors font-medium"
            >
              Decipher Code
            </button>
          </div>

          {decipheredResult && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              {decipheredResult.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <p className="text-red-700 font-medium">Invalid code</p>
                  <p className="text-red-600 text-sm mt-2">
                    Please check that you've copied the code correctly
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-2">You are:</p>
                    <p className="text-2xl font-bold text-primary">
                      {decipheredResult.person}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-3">
                      You're buying gifts for:
                    </p>
                    <div className="space-y-2">
                      {decipheredResult.receivers.map((receiver, idx) => (
                        <div
                          key={idx}
                          className="text-xl font-bold text-red-800 flex items-center gap-2"
                        >
                          <Gift /> {receiver}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};
