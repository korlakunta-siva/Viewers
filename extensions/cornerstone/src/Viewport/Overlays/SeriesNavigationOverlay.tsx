import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  Icons,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ohif/ui-next';

interface SeriesNavigationOverlayProps {
  viewportId: string;
  servicesManager: AppTypes.ServicesManager;
  viewportData: any;
}

/**
 * Series Navigation Overlay Component
 * Displays current series info, dropdown list of all series, and next/prev navigation buttons
 * Positioned in the top-right of the viewport
 */
function SeriesNavigationOverlay({
  viewportId,
  servicesManager,
  viewportData,
}: SeriesNavigationOverlayProps) {
  const { viewportGridService, displaySetService, hangingProtocolService, cineService } = servicesManager.services;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [, setUpdateTrigger] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  // Get the active viewport ID (may be different from this viewport's ID)
  const [activeViewportId, setActiveViewportId] = useState(
    viewportGridService.getActiveViewportId()
  );
  const isActiveViewport = viewportId === activeViewportId;

  // Subscribe to active viewport changes
  useEffect(() => {
    const { unsubscribe } = viewportGridService.subscribe(
      viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED,
      () => {
        setActiveViewportId(viewportGridService.getActiveViewportId());
      }
    );
    return () => unsubscribe();
  }, [viewportGridService]);

  // Get all sorted display sets (same order as study browser)
  const sortedDisplaySets = useMemo(() => {
    return displaySetService.getActiveDisplaySets();
  }, [displaySetService]);

  // Get current display set for THIS viewport (not the active viewport)
  // Navigation should work in context of the current viewport
  const currentDisplaySetInstanceUID = useMemo(() => {
    try {
      // Get display set for this viewport
      if (viewportData?.data?.length) {
        return viewportData.data[0]?.displaySetInstanceUID;
      }
      // Fallback: get from viewport grid state
      const state = viewportGridService.getState();
      if (state?.viewports) {
        const viewport = state.viewports.get(viewportId);
        if (viewport?.displaySetInstanceUIDs?.length) {
          return viewport.displaySetInstanceUIDs[0];
        }
      }
    } catch (error) {
      console.warn('Error getting current display set:', error);
    }
    return null;
  }, [viewportData, viewportId, viewportGridService]);

  // Get current display set info
  const currentDisplaySet = useMemo(() => {
    if (!currentDisplaySetInstanceUID) {
      return null;
    }
    return sortedDisplaySets.find(
      ds => ds.displaySetInstanceUID === currentDisplaySetInstanceUID
    );
  }, [currentDisplaySetInstanceUID, sortedDisplaySets]);

  // Get current index in sorted list
  const currentIndex = useMemo(() => {
    if (!currentDisplaySetInstanceUID) {
      return -1;
    }
    return sortedDisplaySets.findIndex(
      ds => ds.displaySetInstanceUID === currentDisplaySetInstanceUID
    );
  }, [currentDisplaySetInstanceUID, sortedDisplaySets]);

  // Navigation handlers - work in context of THIS viewport
  // Use the same logic as drag-and-drop
  const handleNextSeries = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();

      if (isNavigating || currentIndex < 0 || currentIndex >= sortedDisplaySets.length - 1) {
        return;
      }

      setIsNavigating(true);

      try {
        const nextDisplaySet = sortedDisplaySets[currentIndex + 1];
        if (nextDisplaySet) {
          const state = viewportGridService.getState();
          const isHangingProtocolLayout = state.isHangingProtocolLayout;

          try {
            const updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
              viewportId,
              nextDisplaySet.displaySetInstanceUID,
              isHangingProtocolLayout
            );

            if (updatedViewports.length > 0) {
              // Check if the new display set is non-multiframe and stop cine if needed
              const displaySet = displaySetService.getDisplaySetByUID(nextDisplaySet.displaySetInstanceUID);
              if (displaySet) {
                // Check if this is a true multiframe instance
                let isMultiframe = false;
                if (displaySet.instances && displaySet.instances.length > 0) {
                  isMultiframe = displaySet.instances.some(instance => {
                    const numberOfFrames = instance.NumberOfFrames || instance.numberOfFrames;
                    return numberOfFrames != null && numberOfFrames > 1;
                  });
                }
                if (!isMultiframe && displaySet.isMultiFrame === true) {
                  isMultiframe = true;
                }

                // For non-multiframe display sets, stop cine playback (matching drag-and-drop behavior)
                if (!isMultiframe && !displaySet.FrameRate) {
                  cineService.setCine({ id: viewportId, isPlaying: false });
                }
              }

              // Use setDisplaySetsForViewports which is async
              await viewportGridService.setDisplaySetsForViewports(updatedViewports);

              // Wait longer for the viewport to be fully destroyed and recreated
              // This prevents the "viewport has been destroyed" error
              // Increased delay to allow viewport service to complete its operations
              await new Promise(resolve => setTimeout(resolve, 500));

              // Additional check: wait for viewport to be ready and stable
              let retries = 0;
              let stableCount = 0;
              let lastReadyState = false;
              while (retries < 20) {
                const state = viewportGridService.getState();
                const viewport = state.viewports.get(viewportId);
                const isReady = viewport?.isReady || false;

                // Check if viewport is ready and has been stable for 2 consecutive checks
                if (isReady) {
                  if (isReady === lastReadyState) {
                    stableCount++;
                    if (stableCount >= 2) {
                      break;
                    }
                  } else {
                    stableCount = 1;
                  }
                } else {
                  stableCount = 0;
                }

                lastReadyState = isReady;
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
              }

              // Final safety delay to ensure viewport operations are complete
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (error) {
            console.warn('Failed to navigate to next series:', error);
          }
        }
      } finally {
        // Reset navigation state after a longer delay to ensure viewport is ready
        setTimeout(() => {
          setIsNavigating(false);
        }, 600);
      }
    },
    [currentIndex, sortedDisplaySets, viewportId, viewportGridService, hangingProtocolService, isNavigating]
  );

  const handlePreviousSeries = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();

      if (isNavigating || currentIndex <= 0) {
        return;
      }

      setIsNavigating(true);

      try {
        const prevDisplaySet = sortedDisplaySets[currentIndex - 1];
        if (prevDisplaySet) {
          const state = viewportGridService.getState();
          const isHangingProtocolLayout = state.isHangingProtocolLayout;

          try {
            const updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
              viewportId,
              prevDisplaySet.displaySetInstanceUID,
              isHangingProtocolLayout
            );

            if (updatedViewports.length > 0) {
              // Check if the new display set is non-multiframe and stop cine if needed
              const displaySet = displaySetService.getDisplaySetByUID(prevDisplaySet.displaySetInstanceUID);
              if (displaySet) {
                // Check if this is a true multiframe instance
                let isMultiframe = false;
                if (displaySet.instances && displaySet.instances.length > 0) {
                  isMultiframe = displaySet.instances.some(instance => {
                    const numberOfFrames = instance.NumberOfFrames || instance.numberOfFrames;
                    return numberOfFrames != null && numberOfFrames > 1;
                  });
                }
                if (!isMultiframe && displaySet.isMultiFrame === true) {
                  isMultiframe = true;
                }

                // For non-multiframe display sets, stop cine playback (matching drag-and-drop behavior)
                if (!isMultiframe && !displaySet.FrameRate) {
                  cineService.setCine({ id: viewportId, isPlaying: false });
                }
              }

              // Use setDisplaySetsForViewports which is async
              await viewportGridService.setDisplaySetsForViewports(updatedViewports);

              // Wait longer for the viewport to be fully destroyed and recreated
              // This prevents the "viewport has been destroyed" error
              // Increased delay to allow viewport service to complete its operations
              await new Promise(resolve => setTimeout(resolve, 500));

              // Additional check: wait for viewport to be ready and stable
              let retries = 0;
              let stableCount = 0;
              let lastReadyState = false;
              while (retries < 20) {
                const state = viewportGridService.getState();
                const viewport = state.viewports.get(viewportId);
                const isReady = viewport?.isReady || false;

                // Check if viewport is ready and has been stable for 2 consecutive checks
                if (isReady) {
                  if (isReady === lastReadyState) {
                    stableCount++;
                    if (stableCount >= 2) {
                      break;
                    }
                  } else {
                    stableCount = 1;
                  }
                } else {
                  stableCount = 0;
                }

                lastReadyState = isReady;
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
              }

              // Final safety delay to ensure viewport operations are complete
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (error) {
            console.warn('Failed to navigate to previous series:', error);
          }
        }
      } finally {
        // Reset navigation state after a longer delay to ensure viewport is ready
        setTimeout(() => {
          setIsNavigating(false);
        }, 600);
      }
    },
    [currentIndex, sortedDisplaySets, viewportId, viewportGridService, hangingProtocolService, isNavigating]
  );

  const handleSeriesSelect = useCallback(
    async (displaySetInstanceUID: string) => {
      if (displaySetInstanceUID === currentDisplaySetInstanceUID || isNavigating) {
        setIsDropdownOpen(false);
        return;
      }

      setIsNavigating(true);
      setIsDropdownOpen(false);

      try {
        // Use the same logic as drag-and-drop
        const state = viewportGridService.getState();
        const isHangingProtocolLayout = state.isHangingProtocolLayout;

        try {
          const updatedViewports = hangingProtocolService.getViewportsRequireUpdate(
            viewportId,
            displaySetInstanceUID,
            isHangingProtocolLayout
          );

          if (updatedViewports.length > 0) {
            // Check if the new display set is non-multiframe and stop cine if needed
            const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);
            if (displaySet) {
              // Check if this is a true multiframe instance
              let isMultiframe = false;
              if (displaySet.instances && displaySet.instances.length > 0) {
                isMultiframe = displaySet.instances.some(instance => {
                  const numberOfFrames = instance.NumberOfFrames || instance.numberOfFrames;
                  return numberOfFrames != null && numberOfFrames > 1;
                });
              }
              if (!isMultiframe && displaySet.isMultiFrame === true) {
                isMultiframe = true;
              }

              // For non-multiframe display sets, stop cine playback (matching drag-and-drop behavior)
              if (!isMultiframe && !displaySet.FrameRate) {
                cineService.setCine({ id: viewportId, isPlaying: false });
              }
            }

            // Use setDisplaySetsForViewports which is async
            await viewportGridService.setDisplaySetsForViewports(updatedViewports);

            // Wait longer for the viewport to be fully destroyed and recreated
            // This prevents the "viewport has been destroyed" error
            // Increased delay to allow viewport service to complete its operations
            await new Promise(resolve => setTimeout(resolve, 500));

            // Additional check: wait for viewport to be ready and stable
            let retries = 0;
            let stableCount = 0;
            let lastReadyState = false;
            while (retries < 20) {
              const state = viewportGridService.getState();
              const viewport = state.viewports.get(viewportId);
              const isReady = viewport?.isReady || false;

              // Check if viewport is ready and has been stable for 2 consecutive checks
              if (isReady) {
                if (isReady === lastReadyState) {
                  stableCount++;
                  if (stableCount >= 2) {
                    break;
                  }
                } else {
                  stableCount = 1;
                }
              } else {
                stableCount = 0;
              }

              lastReadyState = isReady;
              await new Promise(resolve => setTimeout(resolve, 100));
              retries++;
            }

            // Final safety delay to ensure viewport operations are complete
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.warn('Failed to set display set:', error);
        }
      } finally {
        // Reset navigation state after a longer delay to ensure viewport is ready
        setTimeout(() => {
          setIsNavigating(false);
        }, 600);
      }
    },
    [
      currentDisplaySetInstanceUID,
      viewportId,
      viewportGridService,
      hangingProtocolService,
      isNavigating,
    ]
  );

  // Subscribe to display set changes
  useEffect(() => {
    const { unsubscribe } = displaySetService.subscribe(
      displaySetService.EVENTS.DISPLAY_SETS_CHANGED,
      () => {
        // Force re-render when display sets change
        setUpdateTrigger(prev => prev + 1);
      }
    );
    return () => unsubscribe();
  }, [displaySetService]);

  // Subscribe to viewport data changes for THIS viewport
  useEffect(() => {
    const { cornerstoneViewportService } = servicesManager.services;
    const { unsubscribe } = cornerstoneViewportService.subscribe(
      cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
      (props) => {
        // Force re-render when viewport data changes for this viewport
        if (props.viewportId === viewportId) {
          setUpdateTrigger(prev => prev + 1);
        }
      }
    );

    return () => unsubscribe();
  }, [viewportId, servicesManager]);

  // Don't render if no display sets or no current display set
  if (!sortedDisplaySets.length || !currentDisplaySet) {
    return null;
  }

  const seriesNumber = currentDisplaySet.SeriesNumber ?? '';
  const seriesDescription = currentDisplaySet.SeriesDescription ?? '';

  // Show full navigation (dropdown + next/prev) only for active viewport
  // For non-active viewports, show only the series description text

  // Get InstanceNumber from first instance for display
  const firstInstance = currentDisplaySet.instances?.[0];
  const instanceNumber = firstInstance?.InstanceNumber ?? '';

  // Format: SeriesNumber-InstanceNumber : SeriesDescription
  const currentSeriesDisplayText = instanceNumber
    ? `${seriesNumber}-${instanceNumber} : ${seriesDescription || ''}`
    : `${seriesNumber} : ${seriesDescription || ''}`;

  // For non-active viewports, show only the text
  if (!isActiveViewport) {
    return (
      <div
        className="flex items-center gap-2 bg-black/70 rounded px-2 py-1 pointer-events-auto"
        style={{ zIndex: 1000 }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 text-white text-sm">
          <span className="truncate max-w-[300px]" title={currentSeriesDisplayText}>
            {currentSeriesDisplayText || 'No Series'}
          </span>
        </div>
      </div>
    );
  }

  // For active viewport, show full navigation
  return (
    <div
      className="flex items-center gap-2 bg-black/70 rounded px-2 py-1 pointer-events-auto"
      style={{ zIndex: 1000 }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Previous Button */}
      <button
        onClick={handlePreviousSeries}
        disabled={currentIndex <= 0 || isNavigating}
        className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed pointer-events-auto"
        title="Previous Series"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Icons.ArrowLeft className="w-4 h-4 text-white" />
      </button>

      {/* Dropdown - Show full series info as selected value */}
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger
          className="flex items-center gap-1 px-3 py-1 rounded hover:bg-white/20 text-white text-sm border border-white/30 pointer-events-auto min-w-[200px] max-w-[400px]"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <span className="text-sm truncate flex-1 text-left" title={currentSeriesDisplayText}>
            {currentSeriesDisplayText || 'Select Series'}
          </span>
          <Icons.ChevronDown className="w-4 h-4 flex-shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-black border-white/30 max-h-[400px] overflow-y-auto pointer-events-auto"
          style={{ zIndex: 1001 }}
          onClick={(e) => e.stopPropagation()}
        >
          {sortedDisplaySets.map((displaySet, index) => {
            const isCurrent = displaySet.displaySetInstanceUID === currentDisplaySetInstanceUID;
            const dsSeriesNumber = displaySet.SeriesNumber ?? '';
            const dsSeriesDescription = displaySet.SeriesDescription ?? '';

            // Get InstanceNumber from first instance (same logic as thumbnail panel)
            const firstInstance = displaySet.instances?.[0];
            const instanceNumber = firstInstance?.InstanceNumber ?? '';

            // Format: SeriesNumber-InstanceNumber : SeriesDescription
            const displayText = instanceNumber
              ? `${dsSeriesNumber}-${instanceNumber} : ${dsSeriesDescription || ''}`
              : `${dsSeriesNumber} : ${dsSeriesDescription || ''}`;

            return (
              <DropdownMenuItem
                key={displaySet.displaySetInstanceUID}
                className={`text-white hover:bg-white/20 pointer-events-auto ${
                  isCurrent ? 'bg-primary-dark/50' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSeriesSelect(displaySet.displaySetInstanceUID);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 w-full">
                  {isCurrent && (
                    <Icons.Checked className="w-4 h-4 text-primary-light" />
                  )}
                  <span className={isCurrent ? 'font-semibold' : ''}>{displayText}</span>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Next Button */}
      <button
        onClick={handleNextSeries}
        disabled={currentIndex >= sortedDisplaySets.length - 1 || isNavigating}
        className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed pointer-events-auto"
        title="Next Series"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Icons.ArrowRight className="w-4 h-4 text-white" />
      </button>
    </div>
  );
}

export default SeriesNavigationOverlay;
