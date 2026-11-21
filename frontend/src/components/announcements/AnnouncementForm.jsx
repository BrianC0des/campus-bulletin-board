import { useEffect, useRef, useState } from 'react';
import '../../styles/announcements.css';

function AnnouncementForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]);
  const [collegeScope, setCollegeScope] = useState('all');
  const imageUrls = useRef(new Set());

  useEffect(() => {
    const urls = imageUrls.current;
    return () => {
      urls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    const newImages = selectedFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      imageUrls.current.add(previewUrl);
      return { file, previewUrl };
    });

    setImages((currentImages) => [
      ...currentImages,
      ...newImages,
    ]);

    // Allow selecting the same file again after removing it.
    e.target.value = '';
  };

  const removeImage = (previewUrl) => {
    setImages((currentImages) => {
      const imageToRemove = currentImages.find((image) => image.previewUrl === previewUrl);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
        imageUrls.current.delete(imageToRemove.previewUrl);
      }
      return currentImages.filter((image) => image.previewUrl !== previewUrl);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log({
      title,
      message,
      collegeScope,
      images: images.map(({ file }) => file),
    });
  };

  const handleFacebookShare = () => {
    const shareUrl = new URL('https://www.facebook.com/sharer/sharer.php');
    shareUrl.searchParams.set('u', window.location.href);
    window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer');
  };

  return (
    <form className="af-form" onSubmit={handleSubmit}>
      <h2 className="af-heading">Create / Edit Content</h2>

      <div className="af-layout">
        {/* LEFT COLUMN */}
        <div className="af-main">
          <fieldset className="af-box">
            <legend>Title Area</legend>
            <input
              className="af-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="[ TITLE ]"
              required
            />
          </fieldset>

          <fieldset className="af-box">
            <legend>Content / Body Area</legend>
            <textarea
              className="af-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="[ CONTENT ]"
              rows={8}
              required
            />
          </fieldset>
        </div>

        {/* RIGHT COLUMN */}
        <div className="af-side">
          <fieldset className="af-box">
            <legend>Pictures</legend>
            <label className="af-label" htmlFor="announcement-images">
              Add pictures
            </label>
            <input
              className="af-input"
              id="announcement-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />

            {images.length > 0 && (
              <div className="af-image-list">
                {images.map(({ file, previewUrl }) => (
                  <div className="af-image-item" key={previewUrl}>
                    <img className="af-image-preview" src={previewUrl} alt={file.name} />
                    <span className="af-image-name">{file.name}</span>
                    <button
                      className="af-remove-image"
                      type="button"
                      onClick={() => removeImage(previewUrl)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="af-box">
            <legend>College Scope</legend>
            <label className="af-label" htmlFor="college-scope">
              Display announcement to
            </label>
            <select
              className="af-input"
              id="college-scope"
              value={collegeScope}
              onChange={(e) => setCollegeScope(e.target.value)}
            >
              <option value="all">All Colleges</option>
              <option value="college-of-computing-studies">College of Computing Studies</option>
              <option value="college-of-engineering">College of Engineering</option>
              <option value="college-of-education">College of Education</option>
              <option value="college-of-business">College of Business</option>
            </select>
          </fieldset>

          <button className="af-button" type="button" onClick={handleFacebookShare}>
            Share on Facebook
          </button>

          <button className="af-button" type="submit">Save</button>
        </div>
      </div>
    </form>
  );
}

export default AnnouncementForm;
