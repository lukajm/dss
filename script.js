// Posts page functions -----------------------------------
window.addEventListener('DOMContentLoaded', function() {
    // Call the openTab function with the desired tab name
    openTab(null, 'Create');
    });
        //Functon for tabs in "Posts" page ---
    function openTab(evt, tabName) {
        // Declare all variables
        var i, tabcontent, tablinks;
    
        // Get all elements with class="tabcontent" and hide them
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
        }
    
        // Get all elements with class="tablinks" and remove the class "active"
        tablinks = document.getElementsByClassName("tablinks");
        for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
        }
    
        // Show the current tab, and add an "active" class to the button that opened the tab
        document.getElementById(tabName).style.display = "block";
        evt.currentTarget.className += " active";
    };

    // Edit post ---
    function editPost(postId) {
    // Retrieve the updated post data from the form using postID
    // Input sanitisation
    const title = document.getElementById('title').textContent;
    const content = document.getElementById('content').textContent;

    const editedPost = {
        title: title,
        content: content,
    };
    // Input sanitisation to only contain int values 
    postId = parseInt(postId);

    fetch(`/posts/${postId}`, {
        method: 'put',
        headers: {
        // Output encoding 
        'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedPost)
    })
    .then(response => {
        if (response.ok) {
        console.log('Post updated successfully');
        // Refresh the page to reflect the updated post
        location.reload();
        } else {
        console.error('Failed to update post:', response.status);
        }
    })
    .catch(error => {
        console.error('Error updating post:', error);
    });
    }

    // Remove post ---
    function removePost(postId) {
    // Input sanitisation to only contain int values 
    postId = parseInt(postId);

    // Send delete request to remove the post
    fetch(`/posts/${postId}`, {
        method: 'delete'
    })
        .then(response => {
            if (response.ok) {
                console.log('Post deleted successfully');
                // Remove the deleted post 
                const postElement = document.getElementById(`post-${postId}`);
                if (postElement) {
                    postElement.remove();
                }
            } else {
                console.error('Failed to remove post:', response.status);
            }
        })
        .catch(error => {
            console.error('Error removing post:', error);
        });
    };

// Browse page functi3ons -----------------------------------
document.getElementById('browsePost').addEventListener('submit', function(event) {
    //Prevent default form submission
    event.preventDefault;

    const query = document.getElementById('search-input').value;

    fetch(`/browse?query=${encodeURIComponent(query)}`)
    .then(response => response.json())
    .then(data => {
        // Handle the search results and update the main section
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = ''; // Clear existing content

        // Display the search results
        data.forEach(post => {
        const postElement = document.createElement('div');
        const titleElement = document.createElement('h2');
        const contentElement = document.createElement('p');
        
        // Output encoding 
        titleElement.textContent = post.title;
        contentElement.textContent = post.content;

        postElement.appendChild(titleElement);
        postElement.appendChild(contentElement);
        mainContent.appendChild(postElement);
        });
    })
    // Error handling 
    .catch(error => {
        console.error('Error searching posts:', error);
    });
});

// HTML encode user-generated content
function encodeHTML(content) {
    return content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}