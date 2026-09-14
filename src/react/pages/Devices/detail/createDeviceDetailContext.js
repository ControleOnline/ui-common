/** Connect section props to the existing state and save contracts. */
export default function createDeviceDetailContext(state, loaders, actions, saves) {
  return {
    ...state,
    ...loaders,
    ...actions,
    ...saves,
    palette: state.brandColors,
    orderVisibility: state.deviceOrderVisibility,
    setOrderVisibility: state.setDeviceOrderVisibility,
    deliveryEnabled: state.deviceDeliveryEnabled,
    setDeliveryEnabled: state.setDeviceDeliveryEnabled,
    savingDeliverySettings: state.savingDeviceDeliverySettings,
    displayAutoPrintProduct: state.displayAutoPrintProductEnabled,
    setDisplayAutoPrintProduct: state.setDisplayAutoPrintProductEnabled,
    savingDisplayPrinting: state.savingDisplayPrintingConfig,
    runtimeDebugInfoEnabled: state.deviceRuntimeDebugInfoEnabled,
    setRuntimeDebugInfoEnabled: state.setDeviceRuntimeDebugInfoEnabled,
  };
}
