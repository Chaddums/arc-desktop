/**
 * useAccountSync — Local progress export/import.
 */

import { useState, useCallback } from "react";
import { exportUserData, importUserData } from "../services/accountSync";

export function useAccountSync() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);

  const doExport = useCallback(async () => {
    setExporting(true);
    try {
      const data = await exportUserData();
      setLastExport(data);
      return data;
    } finally {
      setExporting(false);
    }
  }, []);

  const doImport = useCallback(async (json: string) => {
    setImporting(true);
    try {
      const result = await importUserData(json);
      setImportResult(result);
      return result;
    } finally {
      setImporting(false);
    }
  }, []);

  return {
    exporting,
    importing,
    lastExport,
    importResult,
    doExport,
    doImport,
  };
}
