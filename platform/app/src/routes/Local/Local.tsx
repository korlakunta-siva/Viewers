import React, { useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import { useNavigate } from 'react-router-dom';
import { DicomMetadataStore, MODULE_TYPES, useSystem } from '@ohif/core';

import Dropzone from 'react-dropzone';
import filesToStudies from './filesToStudies';

import { extensionManager } from '../../App';

import { Button, Icons, LoadingIndicatorTotalPercent } from '@ohif/ui-next';

const getLoadButton = (onDrop, text, isDir) => {
  return (
    <Dropzone
      onDrop={onDrop}
      noDrag
    >
      {({ getRootProps, getInputProps }) => (
        <div {...getRootProps()}>
          <Button
            variant="default"
            className="w-28"
            disabled={false}
            onClick={() => {}}
          >
            {text}
            {isDir ? (
              <input
                {...getInputProps()}
                webkitdirectory="true"
                mozdirectory="true"
                style={{ display: 'none' }}
              />
            ) : (
              <input
                {...getInputProps()}
                style={{ display: 'none' }}
              />
            )}
          </Button>
        </div>
      )}
    </Dropzone>
  );
};

type LocalProps = {
  modePath: string;
};

function Local({ modePath }: LocalProps) {
  const { servicesManager } = useSystem();
  const { customizationService } = servicesManager.services;
  const navigate = useNavigate();
  const dropzoneRef = useRef();
  const [dropInitiated, setDropInitiated] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });

  const LoadingIndicatorProgress = customizationService.getCustomization(
    'ui.loadingIndicatorProgress'
  );

  // Initializing the dicom local dataSource
  const dataSourceModules = extensionManager.modules[MODULE_TYPES.DATA_SOURCE];
  const localDataSources = dataSourceModules.reduce((acc, curr) => {
    const mods = [];
    curr.module.forEach(mod => {
      if (mod.type === 'localApi') {
        mods.push(mod);
      }
    });
    return acc.concat(mods);
  }, []);

  const firstLocalDataSource = localDataSources[0];
  const dataSource = firstLocalDataSource.createDataSource({});

  const microscopyExtensionLoaded = extensionManager.registeredExtensionIds.includes(
    '@ohif/extension-dicom-microscopy'
  );

  const onDrop = async acceptedFiles => {
    setDropInitiated(true);
    setLoadingProgress({ loaded: 0, total: acceptedFiles.length });

    const progressCallback = (loaded, total) => {
      setLoadingProgress({ loaded, total });
    };

    const studies = await filesToStudies(acceptedFiles, dataSource, progressCallback);

    const query = new URLSearchParams();

    if (microscopyExtensionLoaded) {
      // TODO: for microscopy, we are forcing microscopy mode, which is not ideal.
      //     we should make the local drag and drop navigate to the worklist and
      //     there user can select microscopy mode
      const smStudies = studies.filter(id => {
        const study = DicomMetadataStore.getStudy(id);
        return (
          study.series.findIndex(s => s.Modality === 'SM' || s.instances[0].Modality === 'SM') >= 0
        );
      });

      if (smStudies.length > 0) {
        smStudies.forEach(id => query.append('StudyInstanceUIDs', id));

        modePath = 'microscopy';
      }
    }

    // Navigate to viewer mode or worklist
    // If modePath is empty, navigate to worklist (/) to let user select a study
    // Otherwise navigate to the specified viewer mode
    studies.forEach(id => query.append('StudyInstanceUIDs', id));
    query.append('datasources', 'dicomlocal');

    if (modePath) {
      // Navigate to specific viewer mode (e.g., 'viewer/dicomlocal' or 'microscopy')
      navigate(`/${modePath}?${decodeURIComponent(query.toString())}`);
    } else {
      // Navigate to worklist (study list) so user can select which study to view
      navigate(`/?${decodeURIComponent(query.toString())}`);
    }
  };

  // Set body style
  useEffect(() => {
    document.body.classList.add('bg-black');
    return () => {
      document.body.classList.remove('bg-black');
    };
  }, []);

  return (
    <Dropzone
      ref={dropzoneRef}
      onDrop={onDrop}
      noClick
    >
      {({ getRootProps }) => (
        <div
          {...getRootProps()}
          style={{ width: '100%', height: '100%' }}
        >
          <div className="flex h-screen w-screen items-center justify-center">
            <div className="bg-muted border-primary/60 mx-auto space-y-2 rounded-xl border border-dashed py-12 px-12 drop-shadow-md">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/favicon.ico"
                    alt="Apex Viewer"
                    style={{ width: '72px', height: '72px' }}
                  />
                  <span className="text-white text-2xl font-medium">Apex Viewer</span>
                </div>
              </div>
              <div className="space-y-2 py-6 text-center">
                {dropInitiated ? (
                  <div className="flex flex-col items-center justify-center pt-12">
                    {loadingProgress.total > 0 ? (
                      <LoadingIndicatorTotalPercent
                        className={'h-full w-full bg-black'}
                        totalNumbers={loadingProgress.total}
                        percentComplete={
                          loadingProgress.total > 0
                            ? Math.round((loadingProgress.loaded / loadingProgress.total) * 100)
                            : 0
                        }
                        loadingText="Loading DICOM files..."
                        targetText="files"
                      />
                    ) : (
                      <LoadingIndicatorProgress className={'h-full w-full bg-black'} />
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-primary pt-0 text-xl">
                      Drag and drop your DICOM files & folders here <br />
                      to load them locally.
                    </p>
                    <p className="text-muted-foreground text-base">
                      Note: Your data remains locally within your browser
                      <br /> and is never uploaded to any server.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-2 pt-4">
                {getLoadButton(onDrop, 'Load files', false)}
                {getLoadButton(onDrop, 'Load folders', true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Dropzone>
  );
}

export default Local;
