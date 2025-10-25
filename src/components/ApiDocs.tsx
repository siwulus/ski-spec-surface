import React, { useMemo } from 'react';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

/**
 * ApiDocs component renders the Scalar API reference documentation
 * for the Ski Surface Spec API using the OpenAPI specification.
 */
const ApiDocs: React.FC = () => {
  // Memoize configuration to prevent unnecessary re-renders
  // since this configuration is static and won't change
  const configuration = useMemo(
    () => ({
      url: '/swagger.yaml',
      theme: 'purple' as const,
      layout: 'modern' as const,
      darkMode: true,
      showSidebar: true,
    }),
    []
  );

  return <ApiReferenceReact configuration={configuration} />;
};

export default ApiDocs;
