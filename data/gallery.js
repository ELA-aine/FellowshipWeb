// Edit this file to manage the gallery. No other code changes needed.
window.GALLERY = {
  // Links to albums you keep in the cloud (Google Photos, iCloud, Google Drive,
  // OneDrive, Flickr, Dropbox...). Each shows as a card that opens the album.
  albums: [
    {
      title: "Summer Retreat 2025",
      description: "A weekend of worship, hiking and campfire stories.",
      provider: "Google Photos",
      url: "https://photos.google.com/",
      cover: "images/gallery/sample-1.svg"
    },
    {
      title: "Christmas Celebration",
      description: "Carols, food and lots of laughter together.",
      provider: "iCloud",
      url: "https://www.icloud.com/sharedalbum/",
      cover: "images/gallery/sample-4.svg"
    }
  ],

  // Individual photos. "src" can be a file in this repo (images/gallery/...)
  // or any direct image URL hosted elsewhere (Cloudinary, Imgur, etc.).
  // "category" is used for the filter buttons.
  photos: [
    { src: "images/gallery/sample-1.svg", alt: "Worship night", caption: "Worship night", category: "Worship" },
    { src: "images/gallery/sample-2.svg", alt: "Sharing a meal", caption: "Sharing a meal", category: "Community" },
    { src: "images/gallery/sample-3.svg", alt: "Bible study", caption: "Bible study", category: "Study" },
    { src: "images/gallery/sample-4.svg", alt: "Serving our neighbours", caption: "Serving our neighbours", category: "Service" },
    { src: "images/gallery/sample-5.svg", alt: "Retreat morning", caption: "Retreat morning", category: "Community" },
    { src: "images/gallery/sample-6.svg", alt: "Prayer circle", caption: "Prayer circle", category: "Worship" }
  ]
};
