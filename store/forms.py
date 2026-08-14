from django.forms import ModelForm
from store.models import VoteProduct
from django import forms
from .models import ContactMessage, AboutUsSection


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


class AboutUsSectionForm(forms.ModelForm):
    class Meta:
        model = AboutUsSection

        fields = (
            'section_type',
            'title',
            'content',
            'icon',
            'image',
            'display_order',
            'is_active',
        )