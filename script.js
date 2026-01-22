function showSection(id) {
  document.querySelectorAll('.content').forEach(section => {
    section.classList.remove('active');
  });

  document.getElementById(id).classList.add('active');
}
