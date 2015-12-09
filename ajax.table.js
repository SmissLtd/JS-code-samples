/*
 * Inputs(type=text) and selects are used to set filters, data-field attribute should be specified
 * Checkboxes are used to select items, data-id should be specified
 * Container content will be replaced after request
 * data-field attribute should have sorting/filtering field name
 * data-id attribute should have id of row
 * data-page should have page for pagination("first", "last" are also allowed)
 * Table should have thead(sorting, filtering, select/deselect all), tbody(data) and tfoot(pagination, create/delete buttons)
 * Optional blocks: containerCreate(create window will be displayed here), containerModify(modify window will be displayed here), containerDelete(delete confirmation window)
 *      shold have form, submit will confirm deletion
 * Functions which can be overriden: ajaxFail(to show custom error)
 * Public functions: reload(used to reload data)
 */
function AjaxTable(container, controller, options)
{
    var self = this;

    this.config = {
        controller:         controller,         // Path to controller(can not be empty)

        container:          container,         // Container of ajax table(can not be empty)
        parentContainer:    container,         // Parent container contain many ajax tables
        
        isTabsInit     :    false,
        containerCreate:    ".forms",          // Container of create item popups
        containerModify:    ".forms",          // Container of modify item popups
        containerDelete:    "#confirmDelete:first",  // Container of delete confirmation
        containerRestore:   "#confirmRestore:first",  // Container of delete confirmation

        classPage:          "page",             // Class of pagination links
        classPageLength:    "pagelength",       // Class of pagination length selectbox
        classIgnore:        "ignore",           // Class for dont assign events
        classRestore:       "restore",          // Class for restore deleted items links/inputs
        classTextPopover:   "long-text-popover",// Class of popovers

        actionCreate:       "showcreateform",   // Create action name
        actionModify:       "showmodifyform",   // Modify action name(POST['id'] will be sent)
        actionDelete:       "delete",           // Delete action name(POST['ids'] will be sent)
        actionRestore:      "restore",          // Restore deleted item action name(POST['id'] will be sent)
        actionShowDeleted:  "showdeleted",      // Show/hide deleted items(POST['show'] will be sent)
        actionList:         "list",             // List data action name
        actionFilter:       "filter",           // Change filter action name(POST['filter'], POST['value'] will be sent)
        actionClaimFilter:  "claimFilter",      // Filter by all filter fields
        actionResetFilter:  "resetFilter",      // Reset all filter fields
        actionSort:         "sort",             // Change sorting action name(POST['field'] will be sent)
        actionPage:         "page",             // Change page action name(POST['page'] will be sent)        

        nameSelectAll:      "selectAll",        // Name of selectAll items checkbox
        nameCreate:         "create",           // Name of create input
        nameEdit:           "edit",             // Name of edit input
        nameDelete:         "delete",           // Name of delete input
        namePage:           "page",             // Name of input for page type
        nameShowDeleted:    "showDeleted",      // Name of checkbox to show/hide deleted items
        
        formIndex:          1,                  // Form index for unique id functionality
    };
    
    this.isCreateingFormNow = false;
    
    for (var prop in this.config)
    {
        if (prop in options)
            this.config[prop] = options[prop];
    }

    this.ajaxSuccess = function(data) {
        ajaxFinish();
        $(self.config.container).html(data);
        setUniqueCheckboxIds(self.config.container);
        $.themingInputs($(self.config.container));
        initTooltipes(self.config.container + ' .' + self.config.classTextPopover);
        self.onAjaxSuccess();
    };

    this.ajaxSuccessCreate = function(data) {
        ajaxFinish();
        if (self.config.containerDelete)
            $(self.config.container + ' ' + self.config.containerDelete).hide();
        $(self.config.container + ' ' + self.config.containerCreate).append(data);
        self.showOverlay();
    };

    this.ajaxSuccessModify = function(id, data) {
        ajaxFinish();
        
        if (self.config.containerDelete)
            $(self.config.container + ' ' + self.config.containerDelete).hide();
        $(self.config.container + ' ' + self.config.containerModify + " #" + id).remove();
        $(self.config.container + ' ' + self.config.containerModify).append(data);
        self.showOverlay();
    };

    this.ajaxFail = function(jqXHR, textStatus, errorThrown){
        self.isCreateingFormNow = false;
        ajaxError(jqXHR, textStatus, errorThrown);
    };
    
    this.sort = function() { // Set sorting, reload data
        var field = $(this).attr("data-field");
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionSort,
            type: "POST",
            data: {
                field: field,
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
        return false;
    };

    this.claimFilter = function(event){
        self.beforeClaimFilter();
        var data = {
            'filters':{},
            addInfo: $(self.config.container + " input[name='addInfo']").val()
        };
        $(self.config.container + ' [data-field]:not(th)').each(function(){
            if($(this).attr("type") == "checkbox"){
                if($(this).is(":checked"))
                    data['filters'][$(this).attr("data-field")] = $(this).val();
                else
                    data['filters'][$(this).attr("data-field")] = '';
            }else{
                data['filters'][$(this).attr("data-field")] = $(this).val();
            }
        });
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionClaimFilter,
            data: data,
            type: "POST",
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
        return false;
    };
    
    this.resetFilter = function(event) { // Set specified filter, reload datas        
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionResetFilter,
            type: "POST",
            data: {
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
        return false;
    };
    
    this.filter = function(event) { // Set specified filter, reload data
        var field = $(this).attr("data-field");
        var value = $(this).val();
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionFilter,
            type: "POST",
            data: {
                field: field,
                value: value,
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
        return false;
    }

    this.filterbykey = function(event) { // Set specified filter, reload data
        var field = $(this).attr("data-field");
        var value = $(this).val();
        if (event.which != 13)
        {
            return true;
        }
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionFilter,
            type: "POST",
            data: {
                field: field,
                value: value,
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
        return false;
    }

    this.select = function() { // Select/deselect all
        $(self.config.container + " tbody input[type='checkbox']:not(." + self.config.classIgnore + ")").prop("checked", $(this).prop("checked")).change();
    }

    this.modify = function() { // Request modification form
        if (!self.beforeModify())
            return false;
        
        if($(this).attr("name") == self.config.nameEdit)
        {
            var checkedcount = $(self.config.container + " tbody input[type='checkbox']:checked").length;
            if(checkedcount > 1)
            {
                var message = $(self.config.container + " tfoot input[name='" + self.config.nameEdit + "']").attr("data-message");
                alert(message);
                return false;
            } 
            else if(checkedcount == 1)
            {
                var id = $(self.config.container + " tbody input[type='checkbox']:checked").parents('tr').attr("data-id");
            } 
            else 
            {
                return false;
            }
        }
        else
        {
            var id = $(this).parent().attr("data-id");
        }
        
        if (self.config.isTabsInit)
        {
            self.beforeTabLoad();
            if($(self.config.parentContainer + ' .nav-tabs li#tab-li-' + id ).length > 0)
            {
                self.showOverlay();
                self.afterModify();
                return $(self.config.parentContainer + ' .nav-tabs li#tab-li-' + id + ' a').tab('show');
            }
        }
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionModify,
            type: "POST",
            data: {
                id: id,
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: function (data) 
            { 
                self.ajaxSuccessModify(id, data); 
                if (self.config.isTabsInit)
                    self.afterTabLoad();
                self.afterModify();
            }
        });
        return false;
    }

    this.create = function() { // Request and show create form
        if (!self.beforeCreate())
            return false;
        
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionCreate,
            type: "POST",
            data: {
                id     : 'create' + self.config.formIndex, 
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: function (data, callback) {
                self.ajaxSuccessCreate(data, callback); 
                self.afterCreate();
            }
        });
        
        return false;
    };

    this.delete = function(confirmed) { // Delete selected items, ask confirmation if there is confirmation text container
        var ids = [];
        $(self.config.container + " tbody input[type='checkbox']").each(function(){
            var checked = $(this).prop('checked');
            if (checked)
            {
                ids.push($(this).attr('data-id'));
            }
        });
        
        if (ids.length == 0)
        {
            return false;
        }
        if (typeof confirmed != 'boolean')
        {
            confirmed = false;
        }
        var confirmPopup = $(self.config.parentContainer + ' ' + self.config.containerDelete);
        if (self.config.containerDelete && !confirmed)
        {
            self.beforeDelete(ids);
            self.showOverlay();
            confirmPopup.find('textarea').val('');
            confirmPopup.show();
            $.centerPopup(confirmPopup);
            confirmPopup.draggable({handle: "h3"});
            return false;
        }

        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionDelete,
            type: "POST",
            data: {
                ids: ids,
                addInfo: $(self.config.container + " input[name='addInfo']").val(),
                comment: confirmPopup.find('textarea').val()
            },
            error: self.ajaxFail,
            success: function(data) {
                self.hideOverlay();
                self.ajaxSuccess(data);
                self.afterDelete();
                confirmPopup.find('textarea').val('');
            }
        });
        return false;
    };

    this.confirmed = function() { // Delete confirmed
        if($(self.config.parentContainer + ' ' + self.config.containerDelete + ' textarea').val().length > 0)
        {
            $(self.config.parentContainer + ' ' + self.config.containerDelete).hide();
            self.delete(true);
        }
        else
        {
            $(self.config.parentContainer + ' ' + self.config.containerDelete + ' textarea').addClass('error-field');
            $(self.config.parentContainer + ' ' + self.config.containerDelete + ' textarea').focus(function() {
                $(this).removeClass('error-field');
            });
        }
        return false;
    };

    this.restoreConfirmed = function() { // Restore confirmed
        if($(self.config.parentContainer + ' ' + self.config.containerRestore + ' textarea').val().length > 0)
        {
            $(self.config.parentContainer + ' ' + self.config.containerRestore).hide();
            self.restore(true);
        }
        else
        {
            $(self.config.parentContainer + ' ' + self.config.containerRestore + ' textarea').addClass('error-field');
            $(self.config.parentContainer + ' ' + self.config.containerRestore + ' textarea').focus(function() {
                $(this).removeClass('error-field');
            });
        }
        return false;
    };

    this.page = function() { // Pagination link clicked, load page
        self.beforePage();
        var page = $(this).attr("data-page");
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionPage,
            type: "POST",
            data: {
                page: page,
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
        return false;
    };

    this.pagelength = function() { // Pagination link clicked, load page
        self.beforePage();
        var pagelength = $(this).val();
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionPage,
            type: "POST",
            data: {
                pagelength: pagelength,
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
        return false;
    };

    this.pagetype = function(event) { // Page typed, load page
        if (event.which != 13)
        {
            return true;
        }
        self.beforePage();
        var page = $(this).val();
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionPage,
            type: "POST",
            data: {
                page: page,
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
        return false;
    }

    this.restore = function(confirmed) { // Restore deleted item
        var id = $(this).attr("data-id");
        var confirmPopup = $(self.config.parentContainer + ' ' + self.config.containerRestore);
        if (typeof confirmed != 'boolean')
        {
            confirmed = false;
        }
        if (self.config.containerRestore && !confirmed)
        {
            var ids = [];
            ids.push(id);
            self.beforeRestore(ids);
            self.showOverlay();
            confirmPopup.find('textarea').val('');
            confirmPopup.show();
            confirmPopup.attr('data-id', id);
            $.centerPopup(confirmPopup);
            confirmPopup.draggable({handle: "h3"});
            return false;
        }
        var sendId = confirmPopup.attr('data-id');
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionRestore,
            type: "POST",
            data: {
                id: sendId,
                addInfo: $(self.config.container + " input[name='addInfo']").val(),
                comment: confirmPopup.find('textarea').val()
            },
            error: self.ajaxFail,
            success: function(data) {
                self.hideOverlay();
                self.ajaxSuccess(data);
                self.afterDelete();
                confirmPopup.find('textarea').val('');
            }
        });
        return false;
    };
    
    this.showOverlay = function()
    {
        $(self.config.parentContainer + ' .table-overlay:first').css('display', 'block');
    };
    
    this.hideOverlay = function()
    {
        setTimeout(function() {
                $(self.config.parentContainer + ' .table-overlay:first').css('display', 'none');
        }, 5);
    };
    
    this.showdeleted = function() { // Show/hide deleted items
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionShowDeleted,
            type: "POST",
            data: {
                show: $(this).prop('checked'),
                addInfo: $(self.config.container + " input[name='addInfo']").val()
            },
            error: self.ajaxFail,
            success: self.ajaxSuccess
        });
    };

    this.initialize = function() { // Bind events
        if (self.config.actionSort && self.config.classIgnore)
            $(self.config.container).on("click", "thead th:not(." + self.config.classIgnore + ")", self.sort);
        
        if (self.config.actionFilter)
        {
            //@need improvments!
            $(self.config.container).on("keypress", "thead input[type='text']", self.filterbykey); // Set filtering(inputs) 
            $(self.config.container).on("change", "thead select", self.filter); // Set filtering(selects)
        }
        if (self.config.actionResetFilter)
        {
            $(self.config.container).on("click", "thead button[name='resetFilter']", self.resetFilter); // Reset filter
        }        
        if (self.config.actionClaimFilter)
        {
            $(self.config.container).on("click", "thead button[name='claimFilter']", self.claimFilter); // Reset filter
        }
        
        // check all checkboxes if check checkbox in the th.checkbox_col ------
//        if (self.config.nameSelectAll){}
        var allSelectCheckboxes = [
            "table:first thead th.checkbox_col input[type='checkbox']",
            "table:first thead input[type='checkbox'][name='" + self.config.nameSelectAll + "']"
        ];
        $(self.config.container).on("click", allSelectCheckboxes.join(','), self.select); // Set selecting
        // =============
        
        if (self.config.containerModify && self.config.actionModify)
        {
            $(self.config.container).on("click", "tbody tr:not(." + self.config.classIgnore + ") td:not(." + self.config.classIgnore + ")", self.modify); // Row editing
            $(self.config.container).on("click", "tfoot input[name='" + self.config.nameEdit + "']", self.modify); // Set edit
        }
        if (self.config.containerCreate && self.config.actionCreate)
        {
            $(self.config.container).on("click", "tfoot input[name='" + self.config.nameCreate + "']", self.create); // Set create
        }
        
        if (self.config.nameDelete && self.config.actionDelete)
        {
            $(self.config.container).on("click", "tfoot input[name='" + self.config.nameDelete + "']", self.delete); // Set delete
            if (self.config.containerDelete)
            {
                // ReInit delete container submit
                $(self.config.parentContainer + ' ' + self.config.containerDelete + " form:not(." + self.config.classIgnore + ")").off("submit");
                $(self.config.parentContainer + ' ' + self.config.containerDelete + " form:not(." + self.config.classIgnore + ")").on("submit", self.confirmed);
                // ReInit delete container close
                $(self.config.parentContainer + ' ' + self.config.containerDelete + " .window-close").off('click');
                $(self.config.parentContainer + ' ' + self.config.containerDelete + " .window-close").click(function () {
                    $(self.config.parentContainer + ' ' + self.config.containerDelete).hide();
                    self.hideOverlay();
                });
            }
        }

        if (self.config.classPage)
        {
            $(self.config.container).on("click", "." + self.config.classPage, self.page); // Set pagination link
        }
        if (self.config.classPageLength)
        {
            $(self.config.container).on("change", "." + self.config.classPageLength, self.pagelength); // Set pagination length
        }
        if (self.config.namePage)
        {
            //!!! need testing/improvment 
            $(self.config.container).on("keypress", "input[name='" + self.config.namePage + "']", self.pagetype); // Set pagination link
        }
        if (self.config.actionRestore)
        {
            $(self.config.container).on("click", "." + self.config.classRestore, self.restore); // Restore deleted items
            if (self.config.containerRestore)
            {
                // ReInit restore container submit
                $(self.config.parentContainer + ' ' + self.config.containerRestore + " form:not(." + self.config.classIgnore + ")").off("submit");
                $(self.config.parentContainer + ' ' + self.config.containerRestore + " form:not(." + self.config.classIgnore + ")").on("submit", self.restoreConfirmed);
                // ReInit restore container close
                $(self.config.parentContainer + ' ' + self.config.containerRestore + " .window-close").off('click');
                $(self.config.parentContainer + ' ' + self.config.containerRestore + " .window-close").click(function () {
                    $(self.config.parentContainer + ' ' + self.config.containerRestore).hide();
                    self.hideOverlay();
                });
            }
        }
        if (self.config.actionShowDeleted && self.config.nameShowDeleted)
        {
            $(self.config.container).on("click", "input[type='checkbox'][name='" + self.config.nameShowDeleted + "']", self.showdeleted);
        }
        
        $(self.config.container).on("change", "tr > td > input[type='checkbox']", function () 
        {
            if ($(this).prop('checked'))
                $(this).parents('tr').addClass('checked');
            else
                $(this).parents('tr').removeClass('checked');
        });
        
        setUniqueCheckboxIds(self.config.container);
        initTooltipes(self.config.container + ' .' + self.config.classTextPopover);
    };
    
    this.reload = function(page) { // Reload list. Should be called after success create/modify action
        var data = {
            addInfo: $(self.config.container + " input[name='addInfo']").val()
        };
        if (page)
            data['page'] = page;
        self.beforeTableReload();
        ajax({
            url: "/" + self.config.controller + "/" + self.config.actionList,
            type: "POST",
            error: self.ajaxFail,
            success: function(data) 
            {
                self.ajaxSuccess(data);
                setUniqueCheckboxIds(self.config.container);
                self.afterTableReload();
            },
            data: data
        });
    };

    this.initialize();
    
    //callbacks 
    this.beforeTabLoad = function() {};
    this.afterTabLoad = function() {};
    this.beforeTableReload = function() {};
    this.afterTableReload = function() {};
    
    // on any Ajax Success 
    this.onAjaxSuccess  = function() {};
    
    //table row deleting action
    this.beforeDelete = function() {};
    this.afterDelete = function() {};

    this.beforeRestore = function() {};
    this.beforePage = function() {};
    
    this.beforeModify = function() {};
    this.beforeCreate = function() {};
    this.afterModify = function() {};
    this.afterCreate = function() {};
    
    this.beforeClaimFilter = function() {};
}