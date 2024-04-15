document.addEventListener('DOMContentLoaded', function () {
    // Get references to the button and content
    const toggleButton = document.getElementById('cs-course-link');
    var content = document.getElementById('cs-course-content');
    
    // Add click event listener to the button
    toggleButton.addEventListener('click', function (event) {
        console.log(event);
        // Toggle the display property of the content element
        if (content.style.display === 'block') {
        content.style.display = 'none';
        } else {
        content.style.display = 'block';
        }
    });
});