document.addEventListener('DOMContentLoaded', function() {
  initializeSlashSearch();
});

let originalHackathons = document.getElementById('hackathons-container').innerHTML;

function initializeSlashSearch() {
  const searchInput = document.getElementById('search-input');

  if (searchInput) {
      document.addEventListener('keydown', function(event) {
          if (event.key === '/') {
              event.preventDefault();
              searchInput.focus();
          }
      });
  }
}

function searchHackathons(searchTerm) {
  const hackathonsContainer = document.getElementById('hackathons-container');

  if (searchTerm.length < 3) {
      hackathonsContainer.innerHTML = originalHackathons;
      return;
  }

  fetch(`/hackathons/search?q=${searchTerm}`)
      .then(response => response.json())
      .then(data => {
          hackathonsContainer.innerHTML = `<p class="search-heading">Search results for <strong>${searchTerm}</strong></p>`;

          if (data.length === 0) {
              hackathonsContainer.innerHTML += `<p class="search-results">No hackathons found for the search term.</p>`;
              return;
          }

          data.forEach(hackathon => {
              const hackathonContainer = createHackathonElement(hackathon);
              hackathonsContainer.appendChild(hackathonContainer);
          });
      })
      .catch(error => {
          hackathonsContainer.innerHTML = `<p class="search-heading">Search results for <strong>${searchTerm}</strong></p><p class="search-results">There was an error fetching the search results, please try again.</p>`;
      });
}

function createHackathonElement(hackathon) {
  const hackathonContainer = document.createElement('article');
  hackathonContainer.classList.add('hackathon-container');

  const hackathonHeaderContainer = document.createElement('div');
  hackathonHeaderContainer.classList.add('hackathon-header-container');

  const hackathonHeader = document.createElement('h2');
  hackathonHeader.innerText = hackathon.hackathon_name;

  const hackathonOrganizer = document.createElement('p');
  hackathonOrganizer.innerText = `Organized by ${hackathon.organizing_body_name}`;

  hackathonHeaderContainer.appendChild(hackathonHeader);
  hackathonHeaderContainer.appendChild(hackathonOrganizer);
  hackathonContainer.appendChild(hackathonHeaderContainer);

  const hackathonMetadataContainer = document.createElement('div');
  hackathonMetadataContainer.classList.add('hackathon-metadata-container');

  const hackathonDate = createMetadataElement(
      `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-480Z"/></svg>`,
      hackathon.last_iteration_date
  );

  const hackathonLocation = createMetadataElement(
      `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/></svg>`,
      hackathon.last_iteration_location
  );

  const hackathonPrizePool = createMetadataElement(
      `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M560-440q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35ZM280-320q-33 0-56.5-23.5T200-400v-320q0-33 23.5-56.5T280-800h560q33 0 56.5 23.5T920-720v320q0 33-23.5 56.5T840-320H280Zm80-80h400q0-33 23.5-56.5T840-480v-160q-33 0-56.5-23.5T760-720H360q0 33-23.5 56.5T280-640v160q33 0 56.5 23.5T360-400Zm440 240H120q-33 0-56.5-23.5T40-240v-440h80v440h680v80ZM280-400v-320 320Z"/></svg>`,
      hackathon.last_prize_pool.toLocaleString('en-IN', {
          style: 'currency',
          currency: 'INR'
      })
  );

  const hackathonWebsiteLink = document.createElement('a');
  hackathonWebsiteLink.classList.add('hackathon-website-url');
  hackathonWebsiteLink.href = hackathon.website_link;
  hackathonWebsiteLink.target = '_blank';
  hackathonWebsiteLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg> Visit Website`;

  hackathonMetadataContainer.appendChild(hackathonDate);
  hackathonMetadataContainer.appendChild(hackathonLocation);
  hackathonMetadataContainer.appendChild(hackathonPrizePool);
  hackathonMetadataContainer.appendChild(hackathonWebsiteLink);
  hackathonContainer.appendChild(hackathonMetadataContainer);

  const hackathonActionsContainer = document.createElement('div');
  hackathonActionsContainer.classList.add('hackathon-actions-container');

  const editHackathon = createActionElement('edit-hackathon', hackathon._id, 'editHackathon');
  const historyHackathon = createActionElement('history-hackathon', hackathon._id, 'historyHackathon');
  const reportHackathon = createActionElement('delete-hackathon', hackathon._id, 'reportHackathon');

  hackathonActionsContainer.appendChild(editHackathon);
  hackathonActionsContainer.appendChild(historyHackathon);
  hackathonActionsContainer.appendChild(reportHackathon);
  hackathonContainer.appendChild(hackathonActionsContainer);

  return hackathonContainer;
}

function createMetadataElement(icon, value) {
  const metadataElement = document.createElement('p');
  metadataElement.classList.add('metadata-item');
  metadataElement.innerHTML = `${icon} ${value}`;
  return metadataElement;
}

function createActionElement(className, id, actionCallback) {
  const actionElement = document.createElement('a');
  actionElement.classList.add(className);
  if (actionCallback === 'reportHackathon') {
      actionElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240ZM330-120 120-330v-300l210-210h300l210 210v300L630-120H330Zm34-80h232l164-164v-232L596-760H364L200-596v232l164 164Zm116-280Z"/></svg>`;
  } else if (actionCallback === 'editHackathon') {
      actionElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>`;
  } else if (actionCallback === 'historyHackathon') {
      actionElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-120q-138 0-240.5-91.5T122-440h82q14 104 92.5 172T480-200q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120v-240h80v94q51-64 124.5-99T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-120Zm112-192L440-464v-216h80v184l128 128-56 56Z"/></svg>`;
  }

  actionElement.onclick = function() {
      window[actionCallback](id);
  };

  return actionElement;
}


function historyHackathon(hackathonId) {
  window.location.href = `/hackathons/${hackathonId}/history`;
}


function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open-modal-container');
  document.getElementById('modals-container').classList.remove('open-modals-container');
  document.getElementsByTagName('body')[0].style.overflow = 'auto';
}


function addHackathon() {
  document.getElementById('add-hackathon-error-message').innerText = '';
  if (document.getElementById('modals-container')) {
      isModalsContainerOpen = document.getElementById('modals-container').classList.contains('open-modals-container');
      if (isModalsContainerOpen) {
          isAddHackathonModalContainerOpen = document.getElementById('add-hackathon-modal').classList.contains('open-modal-container');
          if (isAddHackathonModalContainerOpen) {
              return;
          } else {
              document.getElementById('add-hackathon-modal').classList.add('open-modal-container');
              document.getElementsByTagName('body')[0].style.overflow = 'hidden';
          }
      } else {
          document.getElementById('modals-container').classList.add('open-modals-container');
          document.getElementById('add-hackathon-modal').classList.add('open-modal-container');
          document.getElementsByTagName('body')[0].style.overflow = 'hidden';
      }
  }
}

function addHackathonFormSubmit(event) {
  event.preventDefault();

  const hackathonName = document.getElementById('hackathon-name').value.trim();
  const organizingBodyName = document.getElementById('organizing-body-name').value.trim();
  const lastIterationDate = document.getElementById('last-iteration-date').value.trim();
  const lastIterationLocation = document.getElementById('last-iteration-location').value.trim();
  const lastPrizePool = document.getElementById('last-prize-pool').value.trim();
  const websiteLink = document.getElementById('website-link').value.trim();

  if (hackathonName.length === 0 || organizingBodyName.length === 0 || lastIterationDate.length === 0 || lastIterationLocation.length === 0 || lastPrizePool.length === 0 || websiteLink.length === 0) {
      document.getElementById('add-hackathon-error-message').innerText = `Please, fill the following fields: ${hackathonName.length === 0 ? 'Hackathon Name' : ''} ${organizingBodyName.length === 0 ? 'Organizing Body Name' : ''} ${lastIterationDate.length === 0 ? 'Last Iteration Date' : ''} ${lastIterationLocation.length === 0 ? 'Last Iteration Location' : ''} ${lastPrizePool.length === 0 ? 'Last Prize Pool' : ''} ${websiteLink.length === 0 ? 'Website Link' : ''} to submit the form.`;
      document.getElementById('add-hackathon-error-message-container').style.display = 'block';
      return;
  }

  document.getElementById('add-hackathon-error-message-container').style.display = 'none';

  fetch('/api/v1/hackathons', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              hackathon_name: hackathonName,
              organizing_body_name: organizingBodyName,
              last_iteration_date: lastIterationDate,
              last_iteration_location: lastIterationLocation,
              last_prize_pool: lastPrizePool,
              website_link: websiteLink
          })
      })
      .then(response => response.json())
      .then(data => {
          if (data.status === 'success') {
              document.getElementById('add-hackathon-error-message').style.color = 'green';
              document.getElementById('add-hackathon-error-message').innerText = data.message;
              document.getElementById('add-hackathon-error-message-container').style.display = 'block';
              setTimeout(() => {
                  closeModal('add-hackathon-modal');
                  window.location.reload();
              }, 2000);
          } else {
              document.getElementById('add-hackathon-error-message').innerText = data.message;
              document.getElementById('add-hackathon-error-message-container').style.display = 'block';
          }
      })
      .catch(error => {
          document.getElementById('add-hackathon-error-message').innerText = 'There was an error while calling our servers, please try again later.';
          document.getElementById('add-hackathon-error-message-container').style.display = 'block';
      });

}

function editHackathon(hackathonId) {
    document.getElementById('edit-hackathon-error-message').innerText = '';
  if (document.getElementById('modals-container')) {
      isModalsContainerOpen = document.getElementById('modals-container').classList.contains('open-modals-container');
      if (isModalsContainerOpen) {
          isEditHackathonModalContainerOpen = document.getElementById('edit-hackathon-modal').classList.contains('open-modal-container');
          if (isEditHackathonModalContainerOpen) {
              return;
          } else {
              document.getElementById('edit-hackathon-modal').classList.add('open-modal-container');
              document.getElementsByTagName('body')[0].style.overflow = 'hidden';
          }
      } else {
          document.getElementById('modals-container').classList.add('open-modals-container');
          document.getElementById('edit-hackathon-modal').classList.add('open-modal-container');
          document.getElementsByTagName('body')[0].style.overflow = 'hidden';
      }
  }

  if (document.getElementById('edit-hackathon-error-message').innerText !== '') {
      return;
  }

  fetch(`/api/v1/hackathons/${hackathonId}`)
      .then(response => response.json())
      .then(data => {
          if (data.status === 'error') {
              document.getElementById('edit-hackathon-error-message').innerText = data.message;
              return;
          }
          document.getElementById('edit-hackathon-name').value = data.hackathon.hackathon_name;
          document.getElementById('edit-organizing-body-name').value = data.hackathon.organizing_body_name;
          document.getElementById('edit-last-iteration-date').value = data.hackathon.last_iteration_date;
          document.getElementById('edit-last-iteration-location').value = data.hackathon.last_iteration_location;
          document.getElementById('edit-last-prize-pool').value = data.hackathon.last_prize_pool.replace('₹', '');
          document.getElementById('edit-website-link').value = data.hackathon.website_link;
          document.getElementById('edit-hackathon-id').value = data.hackathon._id;
      })
      .catch(error => {
          document.getElementById('edit-hackathon-error-message').innerText = 'There was an error while fetching the hackathon details, please try again later.';
      });
}

function editHackathonFormSubmit(event) {
  event.preventDefault();

  const hackathonName = document.getElementById('edit-hackathon-name').value.trim();
  const organizingBodyName = document.getElementById('edit-organizing-body-name').value.trim();
  const lastIterationDate = document.getElementById('edit-last-iteration-date').value.trim();
  const lastIterationLocation = document.getElementById('edit-last-iteration-location').value.trim();
  const lastPrizePool = document.getElementById('edit-last-prize-pool').value.trim();
  const websiteLink = document.getElementById('edit-website-link').value.trim();
  const hackathonId = document.getElementById('edit-hackathon-id').value.trim();

  if (hackathonName.length === 0 || organizingBodyName.length === 0 || lastIterationDate.length === 0 || lastIterationLocation.length === 0 || lastPrizePool.length === 0 || websiteLink.length === 0) {
      document.getElementById('edit-hackathon-error-message').innerText = `Please, fill the following fields: ${hackathonName.length === 0 ? 'Hackathon Name' : ''} ${organizingBodyName.length === 0 ? 'Organizing Body Name' : ''} ${lastIterationDate.length === 0 ? 'Last Iteration Date' : ''} ${lastIterationLocation.length === 0 ? 'Last Iteration Location' : ''} ${lastPrizePool.length === 0 ? 'Last Prize Pool' : ''} ${websiteLink.length === 0 ? 'Website Link' : ''} to submit the form.`;
      document.getElementById('edit-hackathon-error-message-container').style.display = 'block';
      return;
  }

  document.getElementById('edit-hackathon-error-message-container').style.display = 'none';

  fetch(`/api/v1/hackathons/${hackathonId}`, {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              hackathon_name: hackathonName,
              organizing_body_name: organizingBodyName,
              last_iteration_date: lastIterationDate,
              last_iteration_location: lastIterationLocation,
              last_prize_pool: lastPrizePool,
              website_link: websiteLink
          })
      })
      .then(response => response.json())
      .then(data => {
          if (data.status === 'success') {
              document.getElementById('edit-hackathon-error-message').style.color = 'green';
              document.getElementById('edit-hackathon-error-message').innerText = data.message;
              document.getElementById('edit-hackathon-error-message-container').style.display = 'block';
              setTimeout(() => {
                  closeModal('edit-hackathon-modal');
                  window.location.reload();
              }, 5000);
          } else {
              document.getElementById('edit-hackathon-error-message').innerText = data.message;
              document.getElementById('edit-hackathon-error-message-container').style.display = 'block';
          }
      })
      .catch(error => {
          document.getElementById('edit-hackathon-error-message').innerText = 'There was an error while calling our servers, please try again later.';
          document.getElementById('edit-hackathon-error-message-container').style.display = 'block';
      });
}

function reportHackathon(hackathonId) {
  document.getElementById('report-hackathon-error-message').innerText = '';
  if (document.getElementById('modals-container')) {
      isModalsContainerOpen = document.getElementById('modals-container').classList.contains('open-modals-container');
      if (isModalsContainerOpen) {
          isReportHackathonModalContainerOpen = document.getElementById('report-hackathon-modal').classList.contains('open-modal-container');
          if (isReportHackathonModalContainerOpen) {
              return;
          } else {
              document.getElementById('report-hackathon-modal').classList.add('open-modal-container');
              document.getElementsByTagName('body')[0].style.overflow = 'hidden';
          }
      } else {
          document.getElementById('modals-container').classList.add('open-modals-container');
          document.getElementById('report-hackathon-modal').classList.add('open-modal-container');
          document.getElementsByTagName('body')[0].style.overflow = 'hidden';
      }
  }

  document.getElementById('report-hackathon-id').value = hackathonId;
}

function reportHackathonFormSubmit(event) {
  event.preventDefault();

  const reportReason = document.getElementById('report-reason').value;
  const reportDescription = document.getElementById('report-description').value;
  const hackathonId = document.getElementById('report-hackathon-id').value;

  if (reportDescription.length === 0) {
      document.getElementById('report-hackathon-error-message').innerText = `Please, fill the description field to submit the form.`;
      document.getElementById('report-hackathon-error-message-container').style.display = 'block';
      return;
  }

  document.getElementById('report-hackathon-error-message-container').style.display = 'none';

  fetch(`/api/v1/hackathons/${hackathonId}/report`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              report_reason: reportReason,
              report_description: reportDescription
          })
      })
      .then(response => response.json())
      .then(data => {
          if (data.status === 'success') {
              document.getElementById('report-hackathon-error-message').style.color = 'green';
              document.getElementById('report-hackathon-error-message').innerText = data.message;
              document.getElementById('report-hackathon-error-message-container').style.display = 'block';
              setTimeout(() => {
                  closeModal('report-hackathon-modal');
                  document.getElementById('report-hackathon-error-message').style.color = '#FF0000';
              }, 2000);
          } else {
              document.getElementById('report-hackathon-error-message').innerText = data.message;
              document.getElementById('report-hackathon-error-message-container').style.display = 'block';
          }
      })
      .catch(error => {
          document.getElementById('report-hackathon-error-message').innerText = 'There was an error while calling our servers, please try again later.';
          document.getElementById('report-hackathon-error-message-container').style.display = 'block';
      });
}