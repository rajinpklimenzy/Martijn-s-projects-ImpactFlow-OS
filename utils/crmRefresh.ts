/**
 * CRM Refresh Utility
 * 
 * Provides utilities to trigger CRM data refresh from anywhere in the app
 */

/**
 * Trigger CRM data refresh
 * Dispatches a custom event that the CRM component listens to
 */
export const triggerCRMRefresh = () => {
  console.log('🔄 Triggering CRM refresh...');
  window.dispatchEvent(new CustomEvent('refresh-crm'));
};

/**
 * Trigger CRM refresh after a delay
 * Useful when you want to ensure backend has processed changes
 */
export const triggerCRMRefreshDelayed = (delayMs: number = 1000) => {
  console.log(`🔄 Scheduling CRM refresh in ${delayMs}ms...`);
  setTimeout(() => {
    triggerCRMRefresh();
  }, delayMs);
};

/**
 * Hook to trigger CRM refresh
 * Can be used in components that need to refresh CRM data
 */
export const useCRMRefresh = () => {
  return {
    refresh: triggerCRMRefresh,
    refreshDelayed: triggerCRMRefreshDelayed,
  };
};
