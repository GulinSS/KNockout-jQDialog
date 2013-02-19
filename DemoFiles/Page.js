/**
 * Created by JetBrains WebStorm.
 * User: User
 * Date: 29.05.11
 * Time: 21:32
 * To change this template use File | Settings | File Templates.
 */

(function($, ko) {
	"use strict";

	function buildEditUserDlg(model, closeCallback){
		return $("#editUserDlg").tmpl().dialog({
					title: model.FIO()+"&nbsp;",
					width: 400,
					create: function(e) {
						var _self = this;
						ko.applyBindings(model, e.target);
						model.FIO.subscribe(function(newValue) {
							$(_self).dialog("option", "title", newValue);
						});
						model.isOperationComplete.subscribe(function(newValue){
							if (newValue === true)
								$(_self).dialog("close");
						});
					},
					close: function(e) {
						$(this).dialog("destroy").remove();
						closeCallback();
					},
					buttons: {
						"Сохранить" : function() {
							model.save();
						},
						"Отмена": function() {
							$(this).dialog("close");
						}
					}
				});
	}
	function buildEmptyUser(){
		return {Id : "",
				Surname: "",
				FirstName: "",
				PatronymicName: "",
				Login: "",
				EMail: ""
			};
	}
	function DataGate() {
		var lastId = 20;
		var modelStub = function() {
			var users = [];
			for (var i = 0; i < 10; i++) {
				users.push({
					Id : i,
					Surname: "Фамилия" + i,
					FirstName: "Имя" + i,
					PatronymicName: "Отчество" + i,
					Login: "Логин" + i,
					EMail: "email@mailforspam.com"
				});
			}
			return {users: users};
		}();

		return{
			Load: function(callback) {
				callback(modelStub);
			},

			DeleteUser: function(callback, Id) {
				for (var i = 0; i < modelStub.users.length; i++) {
					var user = modelStub.users[i];
					if (user.Id === Id) {
						modelStub.users.splice(i, 1);
						callback(true);
						return;
					}
				}
				callback(false);
				return;
			},

			SaveOrUpdateUser: function(callback, updatedUser) {
				if ($.trim(updatedUser.Login) === "") {
					callback(null);
					return;
				}
				for (var i = 0; i < modelStub.users.length; i++) {
					var user = modelStub.users[i];
					if (user.Id === updatedUser.Id) {
						modelStub.users[i] = updatedUser;
						callback(updatedUser);
						return;
					}
				}
				lastId++;
				updatedUser.Id = lastId;
				modelStub.users.push(updatedUser);
				callback(updatedUser);
				return;
			}
		}
	}
	var gate = new DataGate();

	var viewModel = {
		selectedUser : ko.observable(null),
		deleteSelectedUser : function() {
			var user = this.selectedUser();

			gate.DeleteUser(function(result) {
				if (result === true) {
					viewModel.users.remove(user);
					viewModel.selectedUser(null);
				}
			}, user.Id());
		},
		createUser : function() {
			var current = buildEmptyUser();
			var dialogModel = new userEditDialogMapping(current);
			buildEditUserDlg(dialogModel, function(){});
		}
	};

	var mapping = {
		users: {
			key: function(data) {
				return ko.utils.unwrapObservable(data.Id);
			},
			create: function(options) {
				return new userMapping(options.data);
			}
		}
	};

	var userMapping = function(user) {
		ko.mapping.fromJS(user, {}, this);
		this.FIO = ko.dependentObservable(function() {
			return this.Surname() + " " + this.FirstName() + " " + this.PatronymicName();
		}, this);

		var _self = this;

		this.select = function() {
			viewModel.selectedUser(_self);
		};
		this.edit = (function() {
			var currentDialog = null;
			return function() {
				if (currentDialog != null) {
					return;
				}
				var dialogModel = new userEditDialogMapping(ko.mapping.toJS(_self));
				currentDialog = buildEditUserDlg(dialogModel, function() {currentDialog = null});
			};
		})();
	};

	var userEditDialogMapping = function(user) {
		ko.mapping.fromJS(user, {}, this);
		this.FIO = ko.dependentObservable(function() {
			return this.Surname() + " " + this.FirstName() + " " + this.PatronymicName();
		}, this);
		this.isOperationComplete = ko.observable(false);

		var _self = this;
		this.save = function() {
			gate.SaveOrUpdateUser(function(result) {
				if (result === null)
					return;
				_self.isOperationComplete(true);
				for (var i = 0; i < viewModel.users().length; i++) {
					var useri = viewModel.users()[i];
					if (useri.Id() == result.Id) {
						ko.mapping.updateFromJS(useri, result);
						return;
					}
				}
				viewModel.users.push(new userMapping(result));
			}, ko.mapping.toJS(_self))
		}
	}

	$(function() {
		gate.Load(function(loadedModel) {
			ko.mapping.fromJS(loadedModel, mapping, viewModel);
			ko.applyBindings(viewModel);

		});
	});
})(jQuery, ko);
