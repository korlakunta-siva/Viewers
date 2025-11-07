import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import moment from 'moment';
import { Button, ButtonEnums } from '@ohif/ui';
import { preserveQueryParameters } from '../../utils/preserveQueryParameters';

interface Study {
  studyInstanceUid: string;
  accession?: string;
  modalities?: string;
  instances?: number;
  description?: string;
  mrn?: string;
  patientName?: string;
  date?: string;
  time?: string;
}

interface SimpleStudyViewProps {
  studies: Study[];
  dataPath?: string;
  filterValues?: any;
}

function SimpleStudyView({ studies, dataPath = '', filterValues = {} }: SimpleStudyViewProps) {
  const { t } = useTranslation();
  const [selectedStudies, setSelectedStudies] = useState<Set<string>>(new Set());

  const handleCheckboxChange = (studyInstanceUid: string) => {
    setSelectedStudies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studyInstanceUid)) {
        newSet.delete(studyInstanceUid);
      } else {
        newSet.add(studyInstanceUid);
      }
      return newSet;
    });
  };

  const formatDate = (date: string, time?: string) => {
    if (!date) return '';

    // Combine date and time for parsing
    const dateTimeStr = time ? `${date} ${time}` : date;

    // Try parsing with various formats
    const formats = [
      'YYYYMMDD HHmmss.SSS',
      'YYYYMMDD HHmmss',
      'YYYYMMDD HHmm',
      'YYYYMMDD HH',
      'YYYYMMDD',
      'YYYY.MM.DD HHmmss.SSS',
      'YYYY.MM.DD HHmmss',
      'YYYY.MM.DD HHmm',
      'YYYY.MM.DD HH',
      'YYYY.MM.DD',
    ];

    const parsed = moment(dateTimeStr, formats, true);

    if (parsed.isValid()) {
      return parsed.format('YYYY-MM-DD hh:mm A');
    }

    // Fallback: try to format date and time separately
    let formattedDate = '';
    if (moment(date, ['YYYYMMDD', 'YYYY.MM.DD'], true).isValid()) {
      formattedDate = moment(date, ['YYYYMMDD', 'YYYY.MM.DD']).format('YYYY-MM-DD');
    } else {
      formattedDate = date;
    }

    let formattedTime = '';
    if (time && moment(time, ['HH', 'HHmm', 'HHmmss', 'HHmmss.SSS']).isValid()) {
      formattedTime = moment(time, ['HH', 'HHmm', 'HHmmss', 'HHmmss.SSS']).format('hh:mm A');
    }

    return `${formattedDate} ${formattedTime}`.trim();
  };

  return (
    <div className="bg-black text-white">
      <div className="container m-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-secondary-light">
              <th className="w-10 px-2 py-1.5 text-left text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={selectedStudies.size === studies.length && studies.length > 0}
                  onChange={() => {
                    if (selectedStudies.size === studies.length) {
                      setSelectedStudies(new Set());
                    } else {
                      setSelectedStudies(new Set(studies.map(s => s.studyInstanceUid)));
                    }
                  }}
                  className="mr-2"
                />
              </th>
              <th className="w-20 px-2 py-1.5 text-left text-sm font-semibold">{t('StudyList:View')}</th>
              <th className="w-48 px-2 py-1.5 text-left text-sm font-semibold">
                {t('StudyList:PatientName')}
              </th>
              <th className="w-32 px-2 py-1.5 text-left text-sm font-semibold">{t('StudyList:MRN')}</th>
              <th className="w-40 px-2 py-1.5 text-left text-sm font-semibold">
                {t('StudyList:StudyDate')}
              </th>
              <th className="w-64 px-2 py-1.5 text-left text-sm font-semibold">
                {t('StudyList:Description')}
              </th>
              <th className="w-24 px-2 py-1.5 text-left text-sm font-semibold">
                {t('StudyList:Modality')}
              </th>
              <th className="w-32 px-2 py-1.5 text-left text-sm font-semibold">
                {t('StudyList:AccessionNumber')}
              </th>
              <th className="w-20 px-2 py-1.5 text-left text-sm font-semibold">
                {t('StudyList:Instances')}
              </th>
            </tr>
          </thead>
          <tbody>
            {studies.map(study => {
              const {
                studyInstanceUid,
                accession,
                modalities,
                instances,
                description,
                mrn,
                patientName,
                date,
                time,
              } = study;

              const query = new URLSearchParams();
              if (filterValues.configUrl) {
                query.append('configUrl', filterValues.configUrl);
              }
              query.append('StudyInstanceUIDs', studyInstanceUid);
              preserveQueryParameters(query);

              return (
                <tr
                  key={studyInstanceUid}
                  className="border-b border-secondary-light hover:bg-secondary-main transition-colors"
                >
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedStudies.has(studyInstanceUid)}
                      onChange={() => handleCheckboxChange(studyInstanceUid)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    <Link
                      to={`/basic${dataPath}?${query.toString()}`}
                      className="text-primary-light hover:text-primary-active"
                    >
                      <Button
                        type={ButtonEnums.type.primary}
                        size={ButtonEnums.size.small}
                      >
                        {t('StudyList:View')}
                      </Button>
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 truncate whitespace-nowrap" title={patientName || ''}>
                    {patientName || '-'}
                  </td>
                  <td className="px-2 py-1.5 truncate whitespace-nowrap" title={mrn || ''}>
                    {mrn || '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(date || '', time)}</td>
                  <td className="px-2 py-1.5 truncate whitespace-nowrap" title={description || ''}>
                    {description || '-'}
                  </td>
                  <td className="px-2 py-1.5 truncate whitespace-nowrap" title={modalities || ''}>
                    {modalities || '-'}
                  </td>
                  <td className="px-2 py-1.5 truncate whitespace-nowrap" title={accession || ''}>
                    {accession || '-'}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{instances || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SimpleStudyView;
