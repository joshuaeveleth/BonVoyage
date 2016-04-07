/* globals window */
/* globals confirm */

$(function() {
    'use strict';
    var phone = $('input#phone');
    var phoneCache = phone.val();

    phone.intlTelInput({
        utilsScript: '/js/utils.js',
    });

    phone.intlTelInput('setNumber', phoneCache);

    var $select = $('select#country').selectize({
        valueField: 'countryCode',
        labelField: 'country',
        searchField: ['country', 'countryCode'],
        sortField: 'country',
    })[0];

    // Load the JSON file of the countries
    $.ajax({
        method: "GET",
        url: "/data/countryList.json",
        datatype: "json",
        success: function(json) {
            var arrCountries = [];
            for(var key in json) {
                arrCountries.push({ "country": json[key], "countryCode": key });
            }

            $select.selectize.addOption(arrCountries);
            $select.selectize.refreshOptions(false);

            $select.selectize.setValue($('select#country').attr('value'));
        }
    });

    function defaultData($obj) { return $obj.data('default'); }

    function ifChanged($obj) {
        return ($obj.val().toString() === defaultData($obj).toString() ? undefined : $obj.val());
    }

    function ifSelectizeChanged($obj) {
        var $select = $obj.selectize()[0].selectize;
        return ($select.getValue() === defaultData($obj).toString() ?
            undefined :
            $select.getValue());
    }

    function defaultProfileData() {
        return {
            name: defaultData($('input#name')),
            email: defaultData($('input#email')),
            phone: defaultData($('input#phone')),
            countryCode: defaultData($('select#country')),
        };
    }

    function changedProfileData() {
        var data = {};
        if(ifChanged($('input#name'))) { data.name = ifChanged($('input#name')); }
        if(ifChanged($('input#email'))) { data.email = ifChanged($('input#email')); }
        if(ifChanged($('input#phone'))) { data.phone = phone.intlTelInput('getNumber'); }
        if(ifChanged($('select#country'))) { data.countryCode = ifSelectizeChanged($('select#country')); }
        return data;
    }

    function hasProfileDataChanged(changedData) {
        return (
            changedData.name !== undefined ||
            changedData.email !== undefined ||
            changedData.phone !== undefined ||
            changedData.countryCode !== undefined);
    }

    function toggleDisabledSubmissionButton() {
        var changedData = changedProfileData();
        if (hasProfileDataChanged(changedData)) {
            $('form input[type=submit]').removeClass('disabled');
        } else {
            $('form input[type=submit]').addClass('disabled');
        }
    }

    // Events for when the form is changed
    $('form#profile input').on('keyup', toggleDisabledSubmissionButton);
    $select.selectize.on('change', toggleDisabledSubmissionButton);

    // Event for when the form is submitted
    $('form#profile').on('submit', function() {
        var changedData = changedProfileData();
        if(hasProfileDataChanged(changedData)) {
            $.ajax({
                method: 'POST',
                url: '/profile/' + $('input#userId').val(),
                contentType: "application/x-www-form-urlencoded",
                data: {
                    old: defaultProfileData(),
                    new: changedProfileData(),
                },
                dataType: 'json',
                success: function(response) {
                    if (response && response.redirect) {
                        window.location.href = response.redirect;
                    }
                }
            });
        }
    });

    $('#deleteAccount').on('click', function() {
      var id = $('#userId').val();
      var loggedInUserId = $('#loggedInUserId').val();
      var name = $('#headerName').text();
      var text;
      if(id === loggedInUserId) {
        text = 'Are you sure you want to delete your own account?';
      } else {
        text = 'Are you sure that you want to delete ' + name + '\'s account?';
      }
      if(confirm(text)) {
  			$.ajax({
  				method: 'DELETE',
          contentType: "application/x-www-form-urlencoded",
  				data: {
            userId: id,
          },
  				url: '/api/users',
  				dataType: 'json',
  				success: function(response) {
  					if (response && response.redirect) {
              window.location.href = response.redirect;
  					}
  				}
  			});
  		}
    });
});
