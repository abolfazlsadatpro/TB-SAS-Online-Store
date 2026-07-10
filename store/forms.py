from django.forms import ModelForm
from store.models import VoteProduct
from django import forms
from .models import ContactMessage


class VoteSubmitForm(ModelForm):
    class Meta:
        model = VoteProduct
        fields = (
            'rating',
            'description',
        )


class ContactMessageForm(forms.ModelForm):
    class Meta:
        model = ContactMessage

        fields = (
            'name',
            'email',
            'subject',
            'message'
        )