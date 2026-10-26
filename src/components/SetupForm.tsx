import type { SchoolInfo } from '../core/project'

interface Props {
  info: SchoolInfo
  schoolYear: string
  /** Every school year the app has a calendar for */
  schoolYears: string[]
  onSchoolYearChange: (schoolYear: string) => void
  onChange: (info: SchoolInfo) => void
}

const FIELDS: { key: keyof SchoolInfo; label: string }[] = [
  { key: 'schoolName', label: 'Naziv škole' },
  { key: 'city', label: 'Mjesto' },
  { key: 'subject', label: 'Predmet' },
  { key: 'grade', label: 'Razred' },
  { key: 'teacherName', label: 'Nastavnik/ca' },
  { key: 'directorName', label: 'Direktor/ica' },
]

export function SetupForm({ info, schoolYear, schoolYears, onSchoolYearChange, onChange }: Props) {
  return (
    <section className="panel">
      <h2>Osnovni podaci</h2>
      <label className="field">
        <span>Školska godina</span>
        <select value={schoolYear} onChange={(e) => onSchoolYearChange(e.target.value)}>
          {schoolYears.map((year) => (
            <option key={year} value={year}>
              {year}.
            </option>
          ))}
        </select>
      </label>
      {FIELDS.map(({ key, label }) => (
        <label key={key} className="field">
          <span>{label}</span>
          <input
            type="text"
            value={info[key]}
            onChange={(e) => onChange({ ...info, [key]: e.target.value })}
          />
        </label>
      ))}
    </section>
  )
}
