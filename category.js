$(function() {
    // Show category page
    $("#categories").on("click", ".pagination a:not(.disabled)", function() {
        $.ajax({
            url: "/admin/category/list-categories",
            type: "post",
            data: {
                page: $(this).attr("data-page")
            },
            success: function(data) {
                $("#categories").html(data);
            }
        });
        return false;
    });
    
    // Show sub category page
    $("#subcategories").on("click", ".pagination a:not(.disabled)", function() {
        $.ajax({
            url: "/admin/category/list-subcategories",
            type: "post",
            data: {
                parent: $("input[name='parent']").val(),
                page: $(this).attr("data-page")
            },
            success: function(data) {
                $("#subcategories").html(data);
            }
        });
        return false;
    });
    
    // Show edit category popup
    $("#categories").on("click", ".title", function() {
        $.ajax({
            url: "/admin/category/show-edit",
            type: "post",
            data: {
                id: $(this).closest("tr").attr("data-id")
            },
            success: function(data) {
                $("body > .wrap > .container").append(data);
            }
        });
    });
    
    // Show edit subcategory popup
    $("#subcategories").on("click", ".title", function() {
        $.ajax({
            url: "/admin/category/show-edit",
            type: "post",
            data: {
                parent: $("input[name='parent']").val(),
                id: $(this).closest("tr").attr("data-id")
            },
            success: function(data) {
                $("body > .wrap > .container").append(data);
            }
        });
    });
    
    // Show create category popup
    $("#categories").on("click", "#create", function() {
        $.ajax({
            url: "/admin/category/show-edit",
            type: "post",
            success: function(data) {
                $("body > .wrap > .container").append(data);
            }
        });
    });
    
    // Show create subcategory popup
    $("#subcategories").on("click", "#create", function() {
        $.ajax({
            url: "/admin/category/show-edit",
            type: "post",
            data: {
                parent: $("input[name='parent']").val()
            },
            success: function(data) {
                $("body > .wrap > .container").append(data);
            }
        });
    });
    
    // Close category edit popup
    $("body").on("click", "#popup-category .close", function() {
        $("#popup-category").remove();
    });
    
    // Submit category edit/create form
    $("body").on("submit", "#popup-category form", function() {
        $(this).find(".errors").remove();
        $(this).find(".has-error").removeClass("has-error");
        $.ajax({
            url: "/admin/category/submit-edit",
            type: "post",
            data: $(this).serialize(),
            error : function(e) {
                $("#popup-category").find("button").parent().append('<div class="errors">' + e.responseText + "</div>");
            },
            success: function(data) {
                if (!processFormErrors(data, $("#popup-category")))
                    window.location.reload();
            }
        });
        return false;
    });
    
    // Clear input errors on focus
    $("body").on("focus", "#popup-category input", function() {
        $(this).closest(".form-group").removeClass("has-error");
        $(this).closest(".form-group").find(".errors").remove();
    });
    
    // Close delete confirm popups
    $("#confirm-delete-category .close, #confirm-delete-subcategory .close, #confirm-delete-category .btn-default, #confirm-delete-subcategory .btn-default").click(function() {
        $("#confirm-delete-category, #confirm-delete-subcategory").hide();
    });
    
    // Goto subcategory
    $("#categories").on("click", ".table td.subcategories", function() {
        window.location.href = "/admin/category/view?id=" + $(this).closest("tr").attr("data-id");
    });
    
    // Show confirm delete category
    $("#categories").on("click", "#delete", function() {
        var confirm = $("#confirm-delete-category");
        confirm.find("input[name='delete-id']").val($(this).closest("tr").attr("data-id"));
        confirm.find("#title").html($(this).closest("tr").find("td:first").html());
        confirm.show();
    });
    
    // Show confirm delete subcategory
    $("#subcategories").on("click", "#delete", function() {
        var confirm = $("#confirm-delete-subcategory");
        confirm.find("input[name='delete-id']").val($(this).closest("tr").attr("data-id"));
        confirm.find("#title").html($(this).closest("tr").find("td:first").html());
        confirm.show();
    });
    
    // Delete category
    $("#confirm-delete-category .btn-danger").click(function() {
        $("#confirm-delete-category").hide();
        $.ajax({
            url: "/admin/category/delete",
            type: "post",
            data: {
                id: $("#confirm-delete-category input[name='delete-id']").val()
            },
            success: function() {
                $.ajax({
                    url: "/admin/category/list-categories",
                    type: "post",
                    data: {
                        page: $(".pagination li.active a").attr("data-page")
                    },
                    success: function(data) {
                        $("#categories").html(data);
                    }
                });
            }
        });
    });
    
    // Delete sub category
    $("#confirm-delete-subcategory .btn-danger").click(function() {
        $("#confirm-delete-subcategory").hide();
        $.ajax({
            url: "/admin/category/delete",
            type: "post",
            data: {
                id: $("#confirm-delete-subcategory input[name='delete-id']").val()
            },
            success: function() {
               $.ajax({
                    url: "/admin/category/list-subcategories",
                    type: "post",
                    data: {
                        parent: $("input[name='parent']").val(),
                        page: $(".pagination li.active a").attr("data-page")
                    },
                    success: function(data) {
                        $("#subcategories").html(data);
                    }
                }); 
            }
        });
    });
    
    // Restore category
    $("#categories").on("click", "#restore", function() {
        $.ajax({
            url: "/admin/category/restore",
            type: "post",
            data: {
                id: $(this).closest("tr").attr("data-id")
            },
            success: function() {
               $.ajax({
                    url: "/admin/category/list-categories",
                    type: "post",
                    data: {
                        parent: $("input[name='parent']").val(),
                        page: $(".pagination li.active a").attr("data-page")
                    },
                    success: function(data) {
                        $("#categories").html(data);
                    }
                }); 
            }
        });
    });
    
    // Restore subcategory
    $("#subcategories").on("click", "#restore", function() {
        $.ajax({
            url: "/admin/category/restore",
            type: "post",
            data: {
                id: $(this).closest("tr").attr("data-id")
            },
            success: function() {
               $.ajax({
                    url: "/admin/category/list-subcategories",
                    type: "post",
                    data: {
                        parent: $("input[name='parent']").val(),
                        page: $(".pagination li.active a").attr("data-page")
                    },
                    success: function(data) {
                        $("#subcategories").html(data);
                    }
                }); 
            }
        });
    });
});