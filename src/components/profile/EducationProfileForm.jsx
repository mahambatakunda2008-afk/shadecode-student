import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function EducationProfileForm() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [studyLevel, setStudyLevel] = useState('');
  // This will be the parsed JSON from profiles.subjects, representing an array of institutions
  const [educationDetails, setEducationDetails] = useState([]); 
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('study_level, subjects')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
        } else if (profile) {
          setStudyLevel(profile.study_level || '');
          try {
            // Attempt to parse the 'subjects' column as JSON
            // Ensure it defaults to an empty array if null/empty or parsing fails
            setEducationDetails(profile.subjects ? JSON.parse(profile.subjects) : []);
          } catch (e) {
            console.error('Error parsing education details from profile.subjects:', e);
            setEducationDetails([]); // Fallback to empty array on parse error
          }
        }
      }
      setLoading(false);
    }
    fetchProfile();
  }, [supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/profile/education', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          study_level: studyLevel,
          education_details: educationDetails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update education profile');
      }

      alert('Education profile updated successfully!');
    } catch (error) {
      console.error('Error updating education profile:', error.message);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInstitution = () => {
    setEducationDetails(prev => [...prev, {
      institution_name: '',
      qualification_level: '',
      qualification_name: '',
      status: 'enrolled', // Default status
      start_date: '',
      end_date: '',
      semesters: [],
    }]);
  };

  const handleInstitutionChange = (index, field, value) => {
    const newDetails = [...educationDetails];
    newDetails[index][field] = value;
    setEducationDetails(newDetails);
  };

  const handleRemoveInstitution = (index) => {
    setEducationDetails(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddSemester = (institutionIndex) => {
    const newDetails = [...educationDetails];
    newDetails[institutionIndex].semesters.push({
      name: '',
      start_date: '',
      end_date: '',
      courses: [],
    });
    setEducationDetails(newDetails);
  };

  const handleSemesterChange = (institutionIndex, semesterIndex, field, value) => {
    const newDetails = [...educationDetails];
    newDetails[institutionIndex].semesters[semesterIndex][field] = value;
    setEducationDetails(newDetails);
  };

  const handleRemoveSemester = (institutionIndex, semesterIndex) => {
    const newDetails = [...educationDetails];
    newDetails[institutionIndex].semesters = newDetails[institutionIndex].semesters.filter((_, i) => i !== semesterIndex);
    setEducationDetails(newDetails);
  };

  const handleAddCourse = (institutionIndex, semesterIndex) => {
    const newDetails = [...educationDetails];
    newDetails[institutionIndex].semesters[semesterIndex].courses.push({
      subject_id: '', // Ideally, this would be a dropdown linking to the `subjects` table
      course_code: '',
      credits: 0,
      grade: '',
      grade_type: 'letter',
      is_core: true,
      assignments: [], // Future: could link to tasks table
    });
    setEducationDetails(newDetails);
  };

  const handleCourseChange = (institutionIndex, semesterIndex, courseIndex, field, value) => {
    const newDetails = [...educationDetails];
    newDetails[institutionIndex].semesters[semesterIndex].courses[courseIndex][field] = value;
    setEducationDetails(newDetails);
  };

  const handleRemoveCourse = (institutionIndex, semesterIndex, courseIndex) => {
    const newDetails = [...educationDetails];
    newDetails[institutionIndex].semesters[semesterIndex].courses = newDetails[institutionIndex].semesters[semesterIndex].courses.filter((_, i) => i !== courseIndex);
    setEducationDetails(newDetails);
  };

  if (loading) {
    return <p className="p-4 text-center">Loading education profile...</p>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Education Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-control">
          <label className="label"><span className="label-text">Study Level</span></label>
          <select
            className="select select-bordered w-full"
            value={studyLevel}
            onChange={(e) => setStudyLevel(e.target.value)}
            required
          >
            <option value="">Select your study level</option>
            <option value="secondary">Secondary Education</option>
            <option value="university">University</option>
            <option value="polytechnic">Polytechnic</option>
            <option value="college">College</option>
            <option value="vocational">Technical/Vocational</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Only show tertiary education details if study level is not secondary or empty */}
        {studyLevel && studyLevel !== 'secondary' && (
          <div className="border p-4 rounded-lg bg-base-200">
            <h2 className="text-xl font-semibold mb-3">Tertiary Education Details</h2>
            {educationDetails.map((institution, instIndex) => (
              <div key={instIndex} className="mb-6 p-4 border rounded-lg bg-base-100 relative">
                <h3 className="text-lg font-medium mb-2">Institution #{instIndex + 1}</h3>
                <button 
                  type="button" 
                  className="btn btn-sm btn-error absolute top-2 right-2"
                  onClick={() => handleRemoveInstitution(instIndex)}
                >
                  Remove Institution
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="form-control">
                    <label className="label"><span className="label-text">Institution Name</span></label>
                    <input type="text" className="input input-bordered w-full" value={institution.institution_name} onChange={(e) => handleInstitutionChange(instIndex, 'institution_name', e.target.value)} required />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Qualification Level</span></label>
                    <select className="select select-bordered w-full" value={institution.qualification_level} onChange={(e) => handleInstitutionChange(instIndex, 'qualification_level', e.target.value)}>
                      <option value="">Select Level</option>
                      <option value="undergraduate">Undergraduate</option>
                      <option value="postgraduate">Postgraduate</option>
                      <option value="vocational">Vocational</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Qualification Name (e.g., BSc Computer Science)</span></label>
                    <input type="text" className="input input-bordered w-full" value={institution.qualification_name} onChange={(e) => handleInstitutionChange(instIndex, 'qualification_name', e.target.value)} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Status</span></label>
                    <select className="select select-bordered w-full" value={institution.status} onChange={(e) => handleInstitutionChange(instIndex, 'status', e.target.value)}>
                      <option value="enrolled">Enrolled</option>
                      <option value="completed">Completed</option>
                      <option value="dropped">Dropped</option>
                    </select>
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">Start Date</span></label>
                    <input type="date" className="input input-bordered w-full" value={institution.start_date} onChange={(e) => handleInstitutionChange(instIndex, 'start_date', e.target.value)} />
                  </div>
                  <div className="form-control">
                    <label className="label"><span className="label-text">End Date (Optional)</span></label>
                    <input type="date" className="input input-bordered w-full" value={institution.end_date} onChange={(e) => handleInstitutionChange(instIndex, 'end_date', e.target.value)} />
                  </div>
                </div>

                <h4 className="text-md font-medium mt-4 mb-2">Semesters</h4>
                {institution.semesters.map((semester, semIndex) => (
                  <div key={semIndex} className="mb-4 p-3 border rounded-lg bg-base-200 relative">
                    <h5 className="font-normal mb-2">Semester #{semIndex + 1}</h5>
                    <button 
                      type="button" 
                      className="btn btn-xs btn-error absolute top-2 right-2"
                      onClick={() => handleRemoveSemester(instIndex, semIndex)}
                    >
                      Remove Semester
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="form-control">
                        <label className="label"><span className="label-text">Semester Name (e.g., Fall 2023)</span></label>
                        <input type="text" className="input input-bordered w-full" value={semester.name} onChange={(e) => handleSemesterChange(instIndex, semIndex, 'name', e.target.value)} required />
                      </div>
                      <div className="form-control">
                        <label className="label"><span className="label-text">Semester Start Date</span></label>
                        <input type="date" className="input input-bordered w-full" value={semester.start_date} onChange={(e) => handleSemesterChange(instIndex, semIndex, 'start_date', e.target.value)} />
                      </div>
                      <div className="form-control">
                        <label className="label"><span className="label-text">Semester End Date</span></label>
                        <input type="date" className="input input-bordered w-full" value={semester.end_date} onChange={(e) => handleSemesterChange(instIndex, semIndex, 'end_date', e.target.value)} />
                      </div>
                    </div>

                    <h6 className="font-normal mb-2">Courses</h6>
                    {semester.courses.map((course, courseIndex) => (
                      <div key={courseIndex} className="mb-3 p-2 border rounded-lg bg-base-300 relative">
                        <p className="font-medium">Course #{courseIndex + 1}</p>
                        <button 
                          type="button" 
                          className="btn btn-xs btn-error absolute top-2 right-2"
                          onClick={() => handleRemoveCourse(instIndex, semIndex, courseIndex)}
                        >
                          Remove Course
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                          {/* subject_id would ideally link to 'subjects' table for dynamic selection */}
                          <div className="form-control">
                            <label className="label"><span className="label-text">Subject ID (e.g. from 'subjects' table)</span></label>
                            <input type="text" className="input input-bordered w-full" value={course.subject_id} onChange={(e) => handleCourseChange(instIndex, semIndex, courseIndex, 'subject_id', e.target.value)} placeholder="e.g. uuid-of-subject" />
                          </div>
                          <div className="form-control">
                            <label className="label"><span className="label-text">Course Code</span></label>
                            <input type="text" className="input input-bordered w-full" value={course.course_code} onChange={(e) => handleCourseChange(instIndex, semIndex, courseIndex, 'course_code', e.target.value)} required />
                          </div>
                          <div className="form-control">
                            <label className="label"><span className="label-text">Credits</span></label>
                            <input type="number" className="input input-bordered w-full" value={course.credits} onChange={(e) => handleCourseChange(instIndex, semIndex, courseIndex, 'credits', parseInt(e.target.value, 10))} />
                          </div>
                          <div className="form-control">
                            <label className="label"><span className="label-text">Grade Type</span></label>
                            <select className="select select-bordered w-full" value={course.grade_type} onChange={(e) => handleCourseChange(instIndex, semIndex, courseIndex, 'grade_type', e.target.value)}>
                              <option value="letter">Letter (A, B, C)</option>
                              <option value="percentage">Percentage (0-100)</option>
                              <option value="gpa">GPA (4.0 scale)</option>
                            </select>
                          </div>
                          <div className="form-control">
                            <label className="label"><span className="label-text">Grade</span></label>
                            <input type="text" className="input input-bordered w-full" value={course.grade} onChange={(e) => handleCourseChange(instIndex, semIndex, courseIndex, 'grade', e.target.value)} />
                          </div>
                          <div className="form-control flex items-center justify-start mt-2">
                            <label className="label cursor-pointer">
                              <span className="label-text mr-2">Core Course?</span>
                              <input type="checkbox" className="toggle toggle-primary" checked={course.is_core} onChange={(e) => handleCourseChange(instIndex, semIndex, courseIndex, 'is_core', e.target.checked)} />
                            </label>
                          </div>
                        </div>
                        {/* Assignments can be added similarly, linking to task_id */}
                      </div>
                    ))}
                    <button type="button" className="btn btn-sm btn-outline btn-primary mt-2" onClick={() => handleAddCourse(instIndex, semIndex)}>+ Add Course</button>
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-outline btn-secondary mt-2" onClick={() => handleAddSemester(instIndex)}>+ Add Semester</button>
              </div>
            ))}
            <button type="button" className="btn btn-primary mt-4" onClick={handleAddInstitution}>+ Add Institution</button>
          </div>
        )}

        <button type="submit" className="btn btn-success w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Save Education Profile'}
        </button>
      </form>
    </div>
  );
}
